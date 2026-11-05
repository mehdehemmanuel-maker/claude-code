// The one test (npm run gate, with the type check), under a minute: one pass over every domain. For each domain: every
// node in it resolves its ports (its evidence is read from what it is, so always says one), works in units the units parser reads and is dated; every node
// passes its own tests (each run once, though it is in several domains); one quick starter board of the domain's field
// runs with no node failing; and its nodes built before the update are listed, the queue to re-check (their tests may be
// flawed). And nothing outdated is kept: every source file is reached from the node app. With UPDATE_DOCS=1 it writes
// the generated docs first (tests/nexus/docs.ts). The tests from before the update were deleted (2026-10-28, the user:
// "we don't need all these tests"); commit f509152 holds them.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execSync, spawnSync } from 'node:child_process';
import { placeholders, secrets, unsourced, unstated } from './scans';
import { EVIDENCE } from '../../src/nexus/evidence';
import { NEAR_MISS_RESPONSE, callTools, certifiedOf, certifiedView, gateOf, nearMissLine, nearMissesOf, nearMissesView, relayBody, runOf, stepOf, toolsFor, turnOf, type AgentRun, type AgentStep } from '../../src/nexus/agent';
import { createHash } from 'node:crypto';
/** The runners' and the page's handling of a run, from agentBuild's call (or the reply) to its near misses printed or
 *  shown, their texts pinned (the test "an open andon stops the line…" says why). */
const RUN_PINS: [string, string, string, string][] = [
  ['tests/evals/agent.eval.ts', '      const r = await agentBuild(req', 'console.log(`   near miss: ${m}`);', '883bb487a91e3abd'],
  ['tests/evals/one.eval.ts', '  const t0 = Date.now(), r = await agentBuild(EXPECTED.request', 'console.log(`near miss, ${nearMissLine(m)}`);', '08e2a1d87952e6e5'],
  ['src/nexus/view/nodes.ts', '      const r = await res.json()', 'renderAll();', '98c38ebfaba4eed8'],
];
/** The relay's handler, its whole text pinned (the test "an open andon stops the line…" says why). */
const RELAY_PIN = '2a25a6e9b1357859';
/** agentBuild's whole text, pinned (the test "an open andon stops the line…" says why). */
const AGENT_PIN = '9f99c5210a3a349e';
/** The most laws the kernel may still leave undecided (erf and integrals: not in it yet). */
const UNDECIDED_MOST = 3;
import { checkBudget, checkHonesty, checkLoop, checkPush, ownersFromPlan, progressOf, pushes, entriesOf } from '../../scripts/hooks/lib.mjs';
import { byHand, LIMITS } from '../../scripts/by-hand.mjs';
import { dirname, join, relative, resolve } from 'node:path';
import '../../src/nexus/seeds';
import { DOMAINS, LIBRARY, SPEC_FROM, defaultsOf, fits as fitsPorts, portsOf, specProblems, testBlock, type BlockDef } from '../../src/nexus/blocks';
import { relate, UNITS, fromSI } from '../../src/ganglia/units';
import { check } from '../../src/kernel';
import { lawDims, lawWitness, wireDims } from '../../src/nexus/certify';
import { setting } from '../../src/nexus/lawgraph';
import { apply } from '../../src/nexus/law';
import { BOOK } from '../../src/nexus/book';
import { BOLT_SPACING, CLEARANCE, COUNTERBORE, COUNTERSINK, ENGAGEMENT, INSERT, IT_TABLE, TABLE_SOURCES, TAP_DRILL, DEVIATION, NEGATIVE_ROWS, TABLES, fitOf, frameOfAsking, interfacesOf, itFormula, itTolerance, limitsOf, negativeOf, piecesIn, type Asking, type Negative, type NegativeRow, type Refusal } from '../../src/nexus/interfaces';
import { num, scopeOf } from '../../src/nexus/generate';
import { CLEAR } from '../../src/nexus/kinds/motion';
import { METRIC } from '../../src/nexus/threads';
import { DESIGNED, boltedJoint, exampleOf, use } from '../../src/nexus/components';
import { applyImprint, boreGrips, boreThrough, fastenerFor, fit, imprint, portOfInterface, reapplyImprints, standOn, type Fastener, type Imprinted } from '../../src/nexus/mate';
import { massOf } from '../../src/nexus/mass';
import { jointsOfPorts, solveJoints, type Joint, type JointsSolved } from '../../src/nexus/placement/proximity';
import { NEMA_FACE } from '../../src/nexus/families';
import type { Part, V3 } from '../../src/nexus/kits';
import type { Assembly } from '../../src/nexus/assembly';
import { Engine, Memo, digest, emptyBoard, placeBlock, wire, type Env } from '../../src/nexus/dataflow';
import { edgesOf, nodesOf } from '../../src/nexus/boards';
import { starterBoards } from '../../src/nexus/starters';
import { APP, fieldOf, search } from '../../src/nexus/navigate';
import { builtOf } from '../../src/nexus/evidence';
import { parseUnit } from '../../src/ganglia/units';
import { run } from '../../src/nexus/view/code-worker';
import { builtPieces, stockProblems } from '../../src/nexus/stock';
import { turn as roomTurn, insideOf, boundOf as roomBound, endsOf, stack as roomStack, made as roomMade, over as roomOver, through as roomThrough, into as roomInto, partOfBlock, branch as roomBranch, run as roomRun, type Block as RoomBlock } from '../../src/nexus/room';
import { boltedJoint as cpBolted, plate as cpPlate, pipe as cpPipe, coupling as cpCoupling, pipeRun, roundCase as cpRoundCase, section as cpSection, tee as cpTee } from '../../src/nexus/common';

// a board's code blocks run here as the page's worker runs them
const env: Env = { code: async (lang, code, inputs) => (await run({ id: 0, lang: lang as 'js', code, facts: {}, input: '', vars: inputs })).value };
// one quick board for each field a starter board is read as (measured 2026-10-28; a field's slow boards stay in the
// legacy suite): what a person opens first in that field
const QUICK: Record<string, string> = {
  electrical: 'Electrical: a resistor heating', electronics: 'The 6502 from its transistors', finance: 'Business: cash flow',
  manufacturing: 'A battery built from its parts', mechanical: 'Physics: a steel ball let go', life: 'A body from its measured segments',
  software: 'The gauntlet as nodes', structural: 'What it is made of, and what it carries',
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
    const ASKED: [string, string][] = [['buton', 'control.button'], ['joystick', 'control.stick'], ['intractable', 'control.button'], ['walk', 'app.walk'],
      ['scrape a website', 'api.zenrows'], ['exprt step', 'export.files'], ['wieght', 'law.weight'], ['ask claude', 'agent.build'], ['explode', 'explode'], ['take apart', 'explode'],
      ['stres test', 'sweep.range'], ['sprng', 'load.spring'], ['person', 'body'], ['fold into a group', 'app.fold'], ['undo', 'app.undo'], ['slider', 'control.slider'], ['fit to a target', 'fit.target']];
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
    // (every line that starts a table row, however it is spaced: '|A2|…' was skipped in silence before (the evaluator,
    // 2026-11-01))
    const rows = (f: string) => readFileSync(join(root, 'plan', f), 'utf8').split('\n').map((l) => l.trim()).filter((l) => /^\|/.test(l) && !/^\|\s*(Id|Date)\s*\|/.test(l) && !/^\|\s*:?-/.test(l)).map((l) => l.replace(/\|\s*$/, '').split('|').slice(1).map((c) => c.trim()));
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
      if (!/^\d{4}-\d\d-\d\d$/.test(r[0] ?? '')) bad.push(`near miss "${r[1]!.slice(0, 40)}": its date ${r[0]}`); if (!r[3]) bad.push(`near miss "${r[1]!.slice(0, 40)}": nothing says what caught it`);
      if (!r[1]) bad.push(`near miss of ${r[0]}: nothing says what happened`);
      if (r[2] === 'reckless' && (!/^stop, and tell the user\b/i.test(r[4]!) || /\b(never|not|don'?t|no|without|later|but)\b/i.test(r[4]!))) bad.push(`near miss "${r[1]!.slice(0, 40)}": a reckless act's response is to stop and tell the user, first, and nothing taking it back`);
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
    expect(run.nearMisses.map((m) => m.step), 'each at its own step (the build the first, the card the second, the answer after them)').toEqual([1, 1, 2, 2]);
    expect(run.nearMisses[1]!.what, 'the block that failed').toMatch(/^node div failed/);
    // (and through runOf its answer reaches the near misses: numbers with no board are at-risk; a refusal the answer owns
    // up to is an error only, not reckless (the answer dropped at runOf's door passed before: the evaluator, 2026-11-01))
    const rec = (st: AgentStep[], answer: string) => runOf({ start: emptyBoard('t'), board: emptyBoard('t'), steps: st, answer, model: 'm', tokens: { in: 0, out: 0, cached: 0, written: 0 }, made: [] }).then((x) => x.nearMisses.map((m) => m.kind));
    expect(await rec([], 'The spring weighs 19.6 N.'), 'numbers with no board').toEqual(['at-risk']);
    expect(await rec([stepOf('build', {}, '! wire a.x>b.y: no input "y"', 1)], 'The wire into b was refused: it has no input y.'), 'a refusal owned up to').toEqual(['error']);
    // (every refusal the tools make, made by the tools themselves and caught with its kind: change's (a node not there, a
    // setting a block lacks), place's (a block not there, a setting it lacks), a wire written wrong; an answer past change's
    // refusals is reckless; a refused build then a starter board opened leaves no refusal standing (the change tool's
    // refusals were guarded by nothing: the evaluator, 2026-11-01))
    const runTools = async (calls: { name: string; input: Record<string, unknown> }[], answer: string) => { const tt = await toolsFor(emptyBoard('t')), st: AgentStep[] = [];
      for (const [k, c] of calls.entries()) await callTools([{ id: `${k}`, ...c }], tt.doTool, st);
      return (await runOf({ start: emptyBoard('t'), board: tt.board(), steps: st, answer, model: 'm', tokens: { in: 0, out: 0, cached: 0, written: 0 }, made: tt.made })).nearMisses; };
    const changed = await runTools([{ name: 'build', input: { nodes: { a: { b: 'in.number', s: { value: 2 } } } } }, { name: 'change', input: { set: { ghost: { value: 1 }, a: { nosuchsetting: 3 } } } }], 'Done: the value is 5.');
    expect(changed.map((m) => `${m.kind} ${m.tool}`), 'change\'s refusals, then an answer past them').toEqual(['error change', 'error change', 'reckless answer']);
    expect(changed.map((m) => m.what).slice(0, 2).join(' | ')).toMatch(/no node ghost.*\| a: no setting or input nosuchsetting/);
    const placed = await runTools([{ name: 'build', input: { nodes: { a: { b: 'no.such.block' }, b: { b: 'in.number', s: { value: 1, nosuch: 2 } } }, wires: ['b.value to a.x'] } }], 'Three of them were refused: no block, no setting, a wire written wrong.');
    expect(placed.map((m) => `${m.kind} ${m.tool}`), 'place\'s and the wire\'s refusals, owned up to').toEqual(['error build', 'error build', 'error build']);
    expect(placed.map((m) => m.what).join(' | ')).toMatch(/no block "no\.such\.block".*\| b: in\.number has no setting or input nosuch.*\| wire "b\.value to a\.x": write it a\.out>b\.in/);
    const reopened = await runTools([{ name: 'build', input: { nodes: { a: { b: 'no.such.block' } } } }, { name: 'open', input: { title: starterBoards()[0]![0].slice(0, 20) } }], 'Opened the starter board.');
    expect(reopened.map((m) => `${m.kind} ${m.tool}`), 'a board opened after a refused build: nothing standing, nothing reckless').toEqual(['error build']);
    // (and change's other two refusals (a node to take away that is not there, an input to unwire that nothing feeds) and
    // open's (a starter board that is not there): every refusal the tools make, made here (three were made by nothing: the
    // evaluator, 2026-11-01))
    const rest = await runTools([{ name: 'build', input: { nodes: { a: { b: 'in.number', s: { value: 2 } } } } }, { name: 'change', input: { remove: ['ghost'], unwire: ['a.nothing'] } }, { name: 'open', input: { title: 'no such starter board at all' } }], 'Two changes and an opening were refused: no node ghost, nothing feeds a.nothing, no such board.');
    expect(rest.map((m) => `${m.kind} ${m.tool}`), 'change\'s remove and unwire refused, open refused').toEqual(['error change', 'error change', 'error open']);
    expect(rest.map((m) => m.what).join(' | ')).toMatch(/no node ghost.*\| nothing feeds a\.nothing.*\| .*no starter board/);
    // (and the node 'Claude builds a board' gives the near misses its run caught, as the page and the runners show them)
    const outs = (await import('../../src/nexus/agent')).nodeOutputsOf({ ...(await runOf({ start: emptyBoard('t'), board: emptyBoard('t'), steps: [], answer: 'It weighs 4 kg.', model: 'm', tokens: { in: 0, out: 0, cached: 0, written: 0 }, made: [] })) }, 1);
    expect(outs['near misses'], 'the node\'s near misses').toEqual([{ kind: 'at-risk', tool: 'answer', what: expect.any(String), response: expect.any(String) }]);
    expect(portsOf(LIBRARY.get('agent.build')!, {}).outputs.map((p) => p.name), 'the node has an output for them').toContain('near misses');
    expect(String(outs.says)).toMatch(/1 near miss \(at-risk\)/);
    // (the node's run is exactly agentBuild's run handed to nodeOutputsOf, nothing between (its run went back to dropping
    // them, and nothing failed: the evaluator, 2026-11-01))
    const agentSrc0 = readFileSync(join(root, 'src/nexus/agent.ts'), 'utf8'), nodeRun = agentSrc0.slice(agentSrc0.indexOf("  run: async (i, c) => { const t0 = Date.now(), r = await agentBuild(String(i.request ?? c.set.request)"), agentSrc0.indexOf('} } as BlockDef);', agentSrc0.indexOf("id: 'agent.build'")) + 17);
    expect(nodeRun, "the node's run, read exactly").toBe("  run: async (i, c) => { const t0 = Date.now(), r = await agentBuild(String(i.request ?? c.set.request), { model: String(c.set.model), effort: c.set.effort as 'low', steps: Number(c.set.steps), seconds: Number(c.set.seconds), signal: c.signal });\n    return nodeOutputsOf(r, (Date.now() - t0) / 1000); } } as BlockDef);");
    // (the page shows each near miss with its kind and its response, open when one is reckless, and it is called with the
    // run's own (the guard of this was lost in a rewrite once: the evaluator, 2026-11-01))
    const pageView = nearMissesView(run.nearMisses, (x) => x);
    for (const m of run.nearMisses) expect(pageView, `the page shows the ${m.kind} near miss, its kind and its response`).toContain(`<b>${m.kind}</b> ${m.what} (${m.response})`);
    expect(pageView, 'open when one is reckless').toMatch(/^<details open>/);
    const escView = nearMissesView(run.nearMisses, (x) => `[${x}]`);
    for (const m of run.nearMisses) for (const f of [m.tool, m.kind, m.what, m.response]) expect(escView, 'each field escaped as the page escapes it').toContain(`[${f}]`);
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
    // (its whole text pinned, its setup with its loop: a change to it (a wrapper dropping refusals from every tool's result,
    // a step dropped between turns, an answer garbled) fails here until it is read again and its new text pinned on purpose
    // (its setup was not pinned: the evaluator, 2026-11-01))
    expect(createHash('sha256').update(body).digest('hex').slice(0, 16), "agentBuild changed: read it again (its tools from toolsFor as they are, each reply through turnOf, each turn's calls through callTools, its end through runOf) and pin its new text").toBe(AGENT_PIN);
    // (the relay's handling of a run, exactly: from agentBuild's call to the run sent, nothing between that could strip it)
    const relay = readFileSync(join(root, 'vite.view.config.ts'), 'utf8'), callLine = "const r = await m.agentBuild(String(request ?? ''), { model, effort, board, blocks, seconds: 180, steps: 40 });";
    expect(relay.slice(relay.indexOf(callLine), relay.indexOf('res.end(m.relayBody(r));') + 24), 'the relay sends the run as agentBuild made it').toBe(`${callLine}\n      res.setHeader('Content-Type', 'application/json'); res.end(m.relayBody(r));`);
    // (and streamed, as the phone page asks (decision 0023): its steps as they come, short, then the whole run as relayBody makes it)
    expect(relay, 'the stream ends with the whole run').toContain('line({ done: JSON.parse(m.relayBody(r)) });');
    // (on a phone (decision 0025): the second model's check only when the page asks for it, and Assist's one call sent back
    // whole as agentPlan made it)
    expect(relay, 'the check only when asked').toContain('check: check ? undefined : false');
    expect(relay, "Assist's plan, whole").toMatch(/const p = await m\.agentPlan\(String\(request \?\? ''\), \{ model, effort, board, failing: [^\n]*\n\s*res\.setHeader\('Content-Type', 'application\/json'\); res\.end\(JSON\.stringify\(p\)\);/);
    // (the relay sends the page all of the run: its near misses, diff and certificates)
    const sent = JSON.parse(relayBody(run)) as AgentRun; expect(sent.nearMisses, 'every near miss sent whole: its step, tool, what, kind and response').toEqual(run.nearMisses);
    expect(sent, 'and the whole run as it was made (its certificates and diff too)').toEqual(JSON.parse(JSON.stringify(run))); expect(sent.nearMisses.length).toBe(4); expect(sent).toHaveProperty('diff'); expect(sent).toHaveProperty('certificates');
    // (and a run with certificates: a law node built, so a relay that dropped them is seen (the run above has none: the
    // evaluator, 2026-11-01))
    const lt = await toolsFor(emptyBoard('asked')), ls: AgentStep[] = []; await callTools([{ id: '1', name: 'build', input: { nodes: { m: { b: 'in.number', s: { value: 3, unit: 'kg' } }, a: { b: 'in.number', s: { value: 2.5, unit: 'm/s^2' } }, f: { b: 'law.newton.second' } }, wires: ['m.value>f.m', 'a.value>f.a'] } }], lt.doTool, ls);
    const lawRun = await runOf({ start: emptyBoard('asked'), board: lt.board(), steps: ls, answer: 'Done: the force is on the board.', model: 'none (the real tools, no model)', tokens: { in: 0, out: 0, cached: 0, written: 0 }, made: lt.made });
    expect(lawRun.certificates.length, 'a run with certificates').toBeGreaterThan(0); expect(JSON.parse(relayBody(lawRun)), 'sent with its certificates, whole').toEqual(JSON.parse(JSON.stringify(lawRun)));
    // (every near miss the run catches has its kind's response, from the one table: a reckless one, to stop and tell the
    // user (the run's own were held to nothing: the evaluator, 2026-11-01))
    // (held as the log's rows are: a reckless act's, to stop and tell the user, said first; an error's or an at-risk act's
    // naming the check or the rule that caught it; and each caught thing given its own entry)
    for (const [k, r] of Object.entries(NEAR_MISS_RESPONSE)) { if (r.kind === 'reckless') { expect(r.response, `${k}: stop, and tell the user, first`).toMatch(/^stop, and tell the user[:.]/); expect(r.response, `${k}: and nothing taking it back`).not.toMatch(/\b(never|not|don'?t|no|without)\b/i); }
      else expect(r.response, `${k}: names the check or the rule that caught it`).toMatch(/\b(check\w*|test\w*|hooks?|gates?|refus\w*|fails?|failing|rules?|decision|andon)\b/i); }
    const entryOf = (m: { what: string; tool: string }) => (m.what.startsWith('the tool failed') ? 'tool failed' : m.what.startsWith('node ') ? 'node failed' : m.what.startsWith('numbers given') ? 'no board' : m.what.startsWith('answered past') ? 'past a refusal' : 'refused');
    for (const m of [...misses, ...run.nearMisses, ...changed, ...placed, ...reopened, ...rest]) { const e = NEAR_MISS_RESPONSE[entryOf(m)]; expect([m.kind, m.response], `${m.tool}: ${m.what.slice(0, 40)}: its own entry's kind and response`).toEqual([e.kind, e.response]); }
    // (compile.py's own andon refusal, shown: a copy of the plan with an open andon on a passing task fails its --check,
    // naming the task and the one that waits on it)
    const cp = mkdtempSync(join(tmpdir(), 'plan-')); cpSync(join(root, 'plan'), join(cp, 'plan'), { recursive: true });
    writeFileSync(join(cp, 'plan/ANDON.md'), `${readFileSync(join(cp, 'plan/ANDON.md'), 'utf8').trimEnd()}\n| A99 | 2026-11-01 | 00.S5 | planted to show the refusal | open |\n`);
    const cc = spawnSync('python3', [join(cp, 'plan/compile.py'), '--check'], { encoding: 'utf8' });
    expect([cc.status !== 0, /00\.S5 is passing with andon A99 open/.test(cc.stdout + cc.stderr), /00\.S7 is passing with andon A99 open/.test(cc.stdout + cc.stderr)], `compile.py refuses an open andon and what waits on it: ${(cc.stdout + cc.stderr).slice(0, 300)}`).toEqual([true, true, true]);
    // (and two steps down the chain: an open andon on a failing task that a failing one waits on, which a passing one waits
    // on in turn (only the first step was shown: the evaluator, 2026-11-01))
    const tj = join(cp, 'plan/specs/00-structure/tasks.json'), tasks0 = JSON.parse(readFileSync(tj, 'utf8')) as { tasks: { id: string; after: string[] }[] };
    for (const t of tasks0.tasks) { if (t.id === 'S9') t.after = ['S8']; if (t.id === 'S6') t.after = ['S9']; } writeFileSync(tj, JSON.stringify(tasks0, null, 1));
    writeFileSync(join(cp, 'plan/ANDON.md'), `${readFileSync(join(root, 'plan/ANDON.md'), 'utf8').trimEnd()}\n| A98 | 2026-11-01 | 00.S8 | planted two steps up | open |\n`);
    const cc2 = spawnSync('python3', [join(cp, 'plan/compile.py'), '--check'], { encoding: 'utf8' }); rmSync(cp, { recursive: true, force: true });
    expect(/00\.S6 is passing with andon A98 open \(on 00\.S8, which it waits on\)/.test(cc2.stdout + cc2.stderr), `compile.py two steps down: ${(cc2.stdout + cc2.stderr).slice(0, 300)}`).toBe(true);
    // (the page itself is read by running it: npm run eval:ask drives the built page with a real run's relay answer)
    expect(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts['eval:ask'], 'the page checked by running it').toMatch(/tests\/evals\/ask\.eval\.ts/);
    // (the runners' and the page's handling of a run, read exactly from agentBuild's call to the near misses printed or
    // shown: a print skipped, a list emptied or a page clearing them between, passed before (the evaluator, 2026-11-01))
    const region = (t: string, a: string, b: string) => { const i = t.indexOf(a), j = t.indexOf(b, i); return i < 0 || j < 0 ? '' : t.slice(i, t.indexOf('\n', j)); };
    for (const [f, a, b, pin] of RUN_PINS) expect(createHash('sha256').update(region(readFileSync(join(root, f), 'utf8'), a, b)).digest('hex').slice(0, 16), `${f}: its handling of a run's near misses changed: read it again and pin its new text`).toBe(pin);
    // (and what those lines call is agent.ts's own, nothing in its place: imported from it, named nowhere else (a local
    // stand-in for nearMissesView or nearMissLine, its pinned line kept, passed: the evaluator, 2026-11-01))
    for (const [f, name, from, uses] of [['src/nexus/view/nodes.ts', 'nearMissesView', '../agent', 1], ['tests/evals/agent.eval.ts', 'nearMissLine', '../../src/nexus/agent', 1], ['tests/evals/one.eval.ts', 'nearMissLine', '../../src/nexus/agent', 1]] as const) {
      const t = readFileSync(join(root, f), 'utf8');
      expect(new RegExp(`^import \\{[^}]*\\b${name}\\b[^}]*\\} from '${from.replace(/[./]/g, (c) => `\\${c}`)}';$`, 'm').test(t), `${f}: ${name} imported from agent.ts`).toBe(true);
      expect((t.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length, `${f}: ${name} named only where it is imported and used`).toBe(1 + uses); }
    // (the relay's whole handler read exactly, mounted, and answering where the page asks)
    // (the relay whole, its handler and both its mounts (a mount dropped, or the module wrapped as it is loaded, passed when
    // only the handler was read: the evaluator, 2026-11-01)); the page's whole handling of a reply, to its renderAll(), and
    // its answer drawn in the side panel)
    const vite = readFileSync(join(root, 'vite.view.config.ts'), 'utf8'), relayAt = vite.indexOf('const relay = (): Plugin => {'), relayText = vite.slice(relayAt, vite.indexOf('\n};', relayAt) + 3), handler = relayText;
    expect(createHash('sha256').update(relayText).digest('hex').slice(0, 16), "the relay changed: read it again (agentBuild's run sent by relayBody, whole, from both its mounts) and pin its new text").toBe(RELAY_PIN);
    expect((relayText.match(/s\.middlewares\.use\(handle\(/g) ?? []).length, 'both servers mount it').toBe(2);
    expect(readFileSync(join(root, 'src/nexus/view/nodes.ts'), 'utf8'), 'the side panel draws what the reply made').toContain('${askShown}');
    expect(vite, 'the relay mounted').toMatch(/^\s*plugins: \[relay\(\)\],$/m);
    expect(/req\.url !== '([^']+)'/.exec(handler)?.[1], 'it answers where the page asks').toBe(`/${/fetch\('\.\/([^']+)'/.exec(readFileSync(join(root, 'src/nexus/view/nodes.ts'), 'utf8'))?.[1]}`);
    expect(readFileSync(join(root, 'vite.view.config.ts'), 'utf8'), 'the relay answers with relayBody').toMatch(/res\.end\(m\.relayBody\(r\)\)/);
    // (the two runners print each near miss by nearMissLine, its kind first (run here on the run's own), read exactly: a
    // runner that printed none, or printed them without their kind, passed before (the evaluator, 2026-11-01))
    for (const m of run.nearMisses) expect(nearMissLine(m), 'a near miss printed with its kind first').toBe(`${m.kind}: step ${m.step} (${m.tool}): ${m.what} | ${m.response}`);
    const ev = readFileSync(join(root, 'tests/evals/agent.eval.ts'), 'utf8'), one = readFileSync(join(root, 'tests/evals/one.eval.ts'), 'utf8');
    for (const line of ['near: r.nearMisses.map(nearMissLine) };', 'for (const m of (row.near as string[] | undefined) ?? []) console.log(`   near miss: ${m}`);']) expect(ev, 'the evaluation set prints each, by nearMissLine').toContain(line);
    expect(one, 'the one test prints each, by nearMissLine').toContain('for (const m of r.nearMisses) console.log(`near miss, ${nearMissLine(m)}`);');
    // (and the page's count of each kind is the rows' own)
    const counts = (['error', 'at-risk', 'reckless'] as const).map((k) => `${run.nearMisses.filter((m) => m.kind === k).length} ${k}`).join(', ');
    expect(pageView, 'its summary counts each kind as its rows do').toContain(`Near misses caught: ${run.nearMisses.length} (${counts})`);
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
    expect(things.length, 'the corpus').toBeGreaterThan(30);
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
    expect([...kinds].sort(), 'the kinds the corpus holds').toEqual(expect.arrayContaining(['bore', 'holes', 'shaft', 'thread.external', 'thread.internal']));
    const file = join(root, 'tests/nexus/interfaces.ids.json');
    if (process.env.UPDATE_DOCS || !existsSync(file)) writeFileSync(file, JSON.stringify(ids, null, 1) + '\n');
    else expect(ids, 'the same ids as the build that wrote tests/nexus/interfaces.ids.json (UPDATE_DOCS=1 writes it again)').toEqual(JSON.parse(readFileSync(file, 'utf8')));
  }, 60_000);
  // (the tables a negative is sized from (spec 01, I3): every row names its source, each source a document opened (its
  // address, its publisher, whether it is the standard's own text); and the rows agree with each other where they meet:
  // the clearance holes the kinds use are ISO 273's medium; a tap drill is about d − P for the pitch ISO 261 gives; a
  // counterbore is wider than the head it takes and holes through as ISO 273 medium; ISO 286-1's formula lands within a
  // tenth of the standard's rounded table)
  it('the tables negatives need, each row with its source', () => {
    for (const [k, s] of Object.entries(TABLE_SOURCES)) { expect(s.url, `${k}: an address`).toMatch(/^https:\/\//); expect(s.publisher.length, `${k}: who published it`).toBeGreaterThan(3); }
    const tables = { CLEARANCE, TAP_DRILL, COUNTERBORE, COUNTERSINK, ENGAGEMENT, IT_TABLE, INSERT } as Record<string, Record<string, { src: string }>>;
    for (const [t, rows] of Object.entries(tables)) for (const [k, r] of Object.entries(rows)) expect(TABLE_SOURCES[r.src], `${t} ${k}: its source`).toBeTruthy();
    expect(TABLE_SOURCES[BOLT_SPACING.src]).toBeTruthy();
    for (const [k, r] of Object.entries(CLEARANCE)) expect(r.fine < r.medium && r.medium < r.coarse, `${k}: fine, medium, coarse in order`).toBe(true);
    for (const [k, v] of Object.entries(CLEAR)) expect(v, `${k}: the kinds' clearance hole is ISO 273 medium`).toBe(CLEARANCE[k]!.medium);
    for (const [k, r] of Object.entries(TAP_DRILL)) { const d = Number(k.slice(1)); if (METRIC[k]) expect(r.P, `${k}: the pitch ISO 261 gives`).toBe(METRIC[k]!.p); expect(Math.abs(r.drill - (d - r.P)), `${k}: about d − P`).toBeLessThanOrEqual(0.05 + 1e-9); }
    for (const [k, r] of Object.entries(COUNTERBORE)) { if (METRIC[k]) expect(r.d1, `${k}: wider than its ISO 4762 head`).toBeGreaterThan(METRIC[k]!.dk + 0.4); if (CLEARANCE[k]) expect(r.d2, `${k}: its hole ISO 273 medium`).toBe(CLEARANCE[k]!.medium); }
    for (const [k, r] of Object.entries(COUNTERSINK)) { expect(r.Dc).toBeLessThan(r.DcMax); if (CLEARANCE[k]) expect(r.dh, `${k}: its hole ISO 273 medium`).toBe(CLEARANCE[k]!.medium); }
    // (each of Table 1's rows set beside the formula: within a tenth; and Table 1 is what itTolerance gives where held, the
    // formula where not (it gave the formula alone, 7.3 µm for IT6 at 6 mm where the table gives 8: fault D17))
    for (const [step, r] of Object.entries(IT_TABLE)) { const mid = (Number(step.split('-')[0]) + Number(step.split('-')[1])) / 2;
      for (const g of [5, 6, 7, 8, 9] as const) { const want = r[`IT${g}`]; if (want === undefined) continue; const f = itFormula(mid, g), t = itTolerance(mid, g);
        expect(Math.abs(f.um - want) / want, `IT${g} at ${step} mm: ${f.um.toFixed(1)} µm by the formula, ${want} in the table`).toBeLessThan(0.1); expect(f.derived).toMatch(/^derived/);
        expect([t.um, t.derived], `IT${g} at ${step} mm: the table's`).toEqual([want, expect.stringMatching(/^ISO 286-[12], Table 1/)]); } }
    expect([itTolerance(6, 6).um, itTolerance(6.0001, 6).um], 'IT6 at exactly 6 mm, the band over 3 to 6; just over it, the next').toEqual([8, 9]); expect(itTolerance(120, 7).derived, 'no row held: the formula, said').toMatch(/^derived/);
    expect(+BOLT_SPACING.e1.least(18).toFixed(6)).toBe(21.6); expect(BOLT_SPACING.p1.most(20)).toBe(200);
  });
  // (a turned cut made as it is cut (spec 01, I4): an M8 counterbore to DIN 974-1 (15 mm across, 8.4 mm deep: the head's
  // 8 mm and 0.4 mm, typical) over its 9 mm hole (ISO 273 medium) through 20 mm of plate, made an exact solid: what it
  // takes away is its profile's volume of revolution within 0.1 %, the solid is valid, and its STEP reads back the same;
  // the views drill the same profile)
  it('a counterbore cut as a solid, its volume its profile\'s, its STEP the same', async () => {
    const { solidsOf, filesOf, readStep } = await import('../../src/nexus/brep');
    const cb = COUNTERBORE.M8!, t = 0.0084, T = 0.02, prof: [number, number][] = [[cb.d1 / 2000, 0], [cb.d1 / 2000, t], [cb.d2 / 2000, t], [cb.d2 / 2000, T]];
    const cut = { r: cb.d2 / 2000, depth: T, at: [0, T / 2, 0] as V3, dir: [0, -1, 0] as V3, prof };
    const plate: Part = { name: 'counterbored plate', item: 'flat bar 60x20', shape: { box: [0.06, T, 0.06] }, at: [0, 0, 0], mat: 'steel-low', cuts: [cut] };
    const want = Math.PI * ((cb.d1 / 2000) ** 2 * t + (cb.d2 / 2000) ** 2 * (T - t)), sol = await solidsOf(plate), row = sol.rows[0]!;
    expect(row.ok && row.valid, `made and valid: ${row.why ?? ''}`).toBe(true);
    const taken = 0.06 * T * 0.06 - row.volume!; expect(Math.abs(taken / want - 1), `taken ${(taken * 1e9).toFixed(1)} mm³, the profile's ${(want * 1e9).toFixed(1)} mm³`).toBeLessThan(0.001);
    // (and its mass takes the same: it took a plain cylinder of the hole's radius, 43 % short (fault D18, 2026-11-01))
    const massTaken = (0.06 * T * 0.06 * 7850 - massOf(plate)) / 7850; expect(Math.abs(massTaken / want - 1), `the mass takes ${(massTaken * 1e9).toFixed(1)} mm³`).toBeLessThan(1e-9);
    const back = await readStep((await filesOf(plate, { formats: ['step'] })).files['counterbored plate.step'] ?? Object.values((await filesOf(plate, { formats: ['step'] })).files)[0]!);
    expect([back.solids, Math.abs(back.volume / row.volume! - 1) < 0.001], 'its STEP read back: one solid, the same volume').toEqual([1, true]);
    // (the views drill the same profile: the drilled mesh's volume, by its triangles, within 0.5 % (a 24-sided turning))
    const { leafGeometry } = await import('../../src/nexus/view/kit3d'), g = leafGeometry(plate)!, pos = g.attributes.position!, ix = g.index; let mv = 0;
    for (let i = 0; i < (ix ? ix.count : pos.count); i += 3) { const v = [0, 1, 2].map((k) => { const j = ix ? ix.getX(i + k) : i + k; return [pos.getX(j), pos.getY(j), pos.getZ(j)]; }); mv += (v[0]![0]! * (v[1]![1]! * v[2]![2]! - v[1]![2]! * v[2]![1]!) - v[0]![1]! * (v[1]![0]! * v[2]![2]! - v[1]![2]! * v[2]![0]!) + v[0]![2]! * (v[1]![0]! * v[2]![1]! - v[1]![1]! * v[2]![0]!)) / 6; }
    expect(Math.abs(mv / row.volume! - 1), `the views' drilled plate ${(mv * 1e9).toFixed(0)} mm³, the solid's ${(row.volume! * 1e9).toFixed(0)} mm³`).toBeLessThan(0.005);
  }, 120_000);
  // (a plate drilled straight through is drawn from its outline with its holes, no booleans (kit3d.ts throughPlate): along
  // each of its three axes, each hole's wall where its cut is, the volume the box's less the holes' polygons' exactly, and a
  // hole that stops inside it left for the booleans; by booleans alone the engine's deck flange took 51.5 s, 2026-11-02)
  it('a plate drilled straight through: its holes where its cuts are, its volume exact', async () => {
    const { throughPlate, roundSegments } = await import('../../src/nexus/view/kit3d');
    for (const a of [0, 1, 2]) {
      const box: [number, number, number] = [0.1, 0.08, 0.06]; box[a] = 0.012; const u = (a + 1) % 3, v = (a + 2) % 3;
      const at = (p: number, q: number, s: number): V3 => { const x: V3 = [0, 0, 0]; x[a] = s; x[u] = p; x[v] = q; return x; }, dir = (s: number): V3 => { const x: V3 = [0, 0, 0]; x[a] = s; return x; };
      const cuts = [{ r: 0.008, depth: 0.012, at: at(0.02, 0.01, 0.006), dir: dir(-1) }, { r: 0.004, depth: 0.012, at: at(-0.015, -0.012, -0.006), dir: dir(1) }, { r: 0.003, depth: 0.004, at: at(0, 0, 0.006), dir: dir(-1) }];
      const out = throughPlate(box, cuts, 0, true)!; expect(out.rest, `along ${'xyz'[a]}: the blind hole left for the booleans`).toEqual([cuts[2]]);
      const P = out.g.attributes.position!; let vol = 0;
      for (let i = 0; i < P.count; i += 3) { const [p, q, r] = [i, i + 1, i + 2].map((k) => [P.getX(k), P.getY(k), P.getZ(k)]); vol += (p![0]! * (q![1]! * r![2]! - q![2]! * r![1]!) - p![1]! * (q![0]! * r![2]! - q![2]! * r![0]!) + p![2]! * (q![0]! * r![1]! - q![1]! * r![0]!)) / 6; }
      const want = box[0] * box[1] * box[2] - cuts.slice(0, 2).reduce((t, c) => { const n = roundSegments(c.r); return t + (n / 2) * c.r ** 2 * Math.sin((2 * Math.PI) / n) * box[a]!; }, 0);
      expect(Math.abs(vol / want - 1), `along ${'xyz'[a]}: ${(vol * 1e9).toFixed(1)} mm³, the box less its holes ${(want * 1e9).toFixed(1)} mm³`).toBeLessThan(1e-6);
      for (const c of cuts.slice(0, 2)) { let on = 0; for (let k = 0; k < P.count; k++) { const w = [P.getX(k), P.getY(k), P.getZ(k)]; if (Math.abs(Math.hypot(w[u]! - c.at[u]!, w[v]! - c.at[v]!) - c.r) < 1e-7) on++; }
        expect(on, `along ${'xyz'[a]}: the wall of the ${c.r * 2000} mm hole round its cut's middle`).toBeGreaterThanOrEqual(2 * roundSegments(c.r)); }
    }
  });
  // (a cut of any section (spec 01, I17): a slot with round ends 40 × 8 mm milled 4 mm into a block, and a round hole
  // with its anti-rotation notch punched through a 3 mm panel; each takes away its outline's area times its depth, in the
  // mass, in the exact solid and in the views alike; a key standing in the slot is not a clash, a block wider than it is)
  it('a cut of any section: a slot and a notched cut-out, alike in mass, solid and views', async () => {
    const { solidsOf } = await import('../../src/nexus/brep'), { leafGeometry } = await import('../../src/nexus/view/kit3d'), { sectArea } = await import('../../src/nexus/form');
    const meshVol = (p: Part) => { const g = leafGeometry(p)!, pos = g.attributes.position!, ix = g.index; let mv = 0;
      for (let i = 0; i < (ix ? ix.count : pos.count); i += 3) { const v = [0, 1, 2].map((k) => { const j = ix ? ix.getX(i + k) : i + k; return [pos.getX(j), pos.getY(j), pos.getZ(j)]; }); mv += (v[0]![0]! * (v[1]![1]! * v[2]![2]! - v[1]![2]! * v[2]![1]!) - v[0]![1]! * (v[1]![0]! * v[2]![2]! - v[1]![2]! * v[2]![0]!) + v[0]![2]! * (v[1]![0]! * v[2]![1]! - v[1]![1]! * v[2]![0]!)) / 6; }
      return mv; };
    // (the slot: its two ends round, an end mill's 8 mm, as 24 points a half-circle)
    const slot: [number, number][] = [...Array.from({ length: 25 }, (_, i) => { const a = -Math.PI / 2 + (Math.PI * i) / 24; return [0.016 + 0.004 * Math.cos(a), 0.004 * Math.sin(a)] as [number, number]; }), ...Array.from({ length: 25 }, (_, i) => { const a = Math.PI / 2 + (Math.PI * i) / 24; return [-0.016 + 0.004 * Math.cos(a), 0.004 * Math.sin(a)] as [number, number]; })];
    // (the cut-out: a 22.3 mm round with a 3.2 × 1.7 mm notch at its top, as a 64-gon broken by the notch)
    const R = 0.0223 / 2, nw = 0.0032 / 2, notch: [number, number][] = []; for (let i = 0; i <= 64; i++) { const a = Math.PI / 2 + Math.asin(nw / R) + ((2 * Math.PI - 2 * Math.asin(nw / R)) * i) / 64; notch.push([R * Math.cos(a), R * Math.sin(a)]); }
    notch.push([nw, R * Math.cos(Math.asin(nw / R)) + 0.0017], [-nw, R * Math.cos(Math.asin(nw / R)) + 0.0017]);
    for (const [name, box, sect, depth, u] of [['keyed block', [0.06, 0.03, 0.06], slot, 0.004, [1, 0, 0]], ['panel', [0.06, 0.003, 0.06], notch, 0.003, [0, 0, 1]]] as [string, V3, [number, number][], number, V3][]) {
      const cut = { r: Math.max(...sect.map(([x, y]) => Math.hypot(x, y))), depth, at: [0, box[1] / 2, 0] as V3, dir: [0, -1, 0] as V3, u, sect };
      const p: Part = { name, item: name, shape: { box }, at: [0, 0, 0], mat: 'steel-low', cuts: [cut] }, want = sectArea(sect) * depth, V = box[0] * box[1] * box[2];
      expect(Math.abs((V * 7850 - massOf(p)) / 7850 / want - 1), `${name}: the mass less its outline's area times its depth`).toBeLessThan(1e-9);
      const row = (await solidsOf(p)).rows[0]!; expect(row.ok && row.valid, `${name}: made and valid: ${row.why ?? ''}`).toBe(true);
      expect(Math.abs((V - row.volume!) / want - 1), `${name}: the solid takes ${((V - row.volume!) * 1e9).toFixed(1)} mm³, its outline ${(want * 1e9).toFixed(1)} mm³`).toBeLessThan(0.001);
      // (the views: what the drilled mesh loses to the cut, against the outline's area times its depth (the plate itself drawn
      // with its edges broken, which a thin panel's volume shows))
      const lost = meshVol({ ...p, cuts: undefined }) - meshVol(p); expect(Math.abs(lost / want - 1), `${name}: the views drill ${(lost * 1e9).toFixed(1)} mm³, its outline ${(want * 1e9).toFixed(1)} mm³`).toBeLessThan(0.005);
    }
  }, 120_000);
  // (the negative an interface asks (spec 01, I5): the evaluation set's cases 1, 2, 3 and 7 (evals/interfaces/cases.json,
  // their numbers worked by hand from the sources before the code ran) give their expected numbers: a clearance hole and
  // its counterbore, a tapped hole refused for want of thread, an insert's hole and the insert, a motor's face)
  it('the negative of an interface: the evaluation cases give their numbers', () => {
    const set = JSON.parse(readFileSync(join(root, 'evals/interfaces/cases.json'), 'utf8')) as { cases: { case: number; asking: Asking; host: { material: string; thickness: number }; expect?: Record<string, number | string | boolean> }[] };
    const mm = (x: number) => +(x * 1000).toFixed(4), got: string[] = [], ours = set.cases.filter((c) => c.expect && c.asking); // (a case with a fastener asking and its numbers: the cases waiting on 01.I17 have no asking)
    expect(ours.map((c) => c.case), 'the cases I5 answers for').toEqual([1, 2, 3, 7]);
    for (const c of ours) {
      const n = negativeOf(c.asking, { material: c.host.material, thickness: c.host.thickness / 1000 }), e = c.expect!, say = (k: string, v: unknown) => got.push(`case ${c.case} ${k}: ${JSON.stringify(v)}`);
      if (e.refused) { const r = n as Refusal; expect(r.refused, `case ${c.case} refused: ${r.why ?? ''}`).toBe(true); expect([r.rule, +r.need.toFixed(3), r.have], `case ${c.case}: by what rule, how much`).toEqual([e.refused, e.need, e.have]); expect(r.why.length).toBeGreaterThan(20); say('refused', r.why); continue; }
      const g = n as Negative; expect((n as Refusal).refused, `case ${c.case}: ${(n as Refusal).why ?? ''}`).toBeUndefined(); expect(g.mirror.kind, `case ${c.case}: its mirror`).toBe(e.mirror);
      const removes = g.tools.filter((x) => x.role === 'remove');
      if (e.hole !== undefined) expect(mm(removes[0]!.prof!.at(-1)![0] * 2), `case ${c.case}: the hole`).toBe(e.hole);
      if (e.counterbore !== undefined) expect([mm(removes[0]!.prof![0]![0] * 2), mm(removes[0]!.prof![1]![1])], `case ${c.case}: the counterbore and its depth`).toEqual([e.counterbore, e.counterbore_depth]);
      if (e.keep) expect(g.tools.some((x) => x.role === 'keep'), `case ${c.case}: a keep along the axis`).toBe(true);
      if (e.contact) expect(g.tools.some((x) => x.role === 'contact'), `case ${c.case}: the face that bears`).toBe(true);
      if (e.insert) { expect(g.parts.map((p) => p.name), `case ${c.case}: the insert placed as a part`).toEqual([`heat-set insert ${(c.asking as { thread: string }).thread}`]); const row = INSERT[(c.asking as { thread: string }).thread]!; expect([mm(removes[0]!.prof![0]![0] * 2), mm(removes[0]!.prof![1]![1])], `case ${c.case}: the insert's hole and depth, its maker's`).toEqual([row.hole, row.depth]); if (e.insert_hole !== undefined) expect([row.hole, row.depth]).toEqual([e.insert_hole, e.insert_depth]); }
      if (e.holes !== undefined) { const small = removes.filter((x) => mm(x.prof![0]![0] * 2) === e.hole), pilot = removes.find((x) => mm(x.prof![0]![0] * 2) === e.pilot);
        expect(small.length, `case ${c.case}: its holes`).toBe(e.holes); expect(small.map((x) => mm(Math.abs(x.at![0]) * 2)), `case ${c.case}: on its square`).toEqual(Array(e.holes as number).fill(e.square)); expect(pilot?.why, `case ${c.case}: the pilot's bore`).toMatch(new RegExp(`\\+${e.pilot_upper_um} µm`)); }
      for (const w of g.why) expect(w, `case ${c.case}: each size says where it came from`).toMatch(/ISO|DIN|Bossard|NEMA|typical|insert|derived/);
      say('ok', g.why[0]);
    }
    expect(got.length).toBe(ours.length);
  });
  // (the checks before cutting (spec 01, I7): imprinted on a steel or aluminium plate where the case says, cases 2, 4 and 5
  // are refused by the rule and by the value worked out by hand (no thread room; an edge too near; a hole too near
  // another), and case 1 passes every check)
  it('the checks before cutting: cases 2, 4 and 5 refused by their rule and value, case 1 passing', () => {
    const set = JSON.parse(readFileSync(join(root, 'evals/interfaces/cases.json'), 'utf8')) as { cases: { case: number; asking: Asking; host: { material: string }; imprint?: { plate: [number, number, number]; at: [number, number]; holes: [number, number][]; expect: { ok?: boolean; refused?: string; need?: number; have?: number } } }[] };
    const ours = set.cases.filter((c) => c.imprint); expect(ours.map((c) => c.case), 'the cases I7 answers for').toEqual([1, 2, 4, 5]);
    for (const c of ours) { const im = c.imprint!, [W, T, Dp] = im.plate.map((x) => x / 1000) as [number, number, number];
      const plate: Part = { name: 'plate', item: `plate ${im.plate.join('x')}`, mat: c.host.material, shape: { box: [W, T, Dp] }, at: [0, 0, 0], ...(im.holes.length ? { cuts: im.holes.map(([x, z]) => ({ r: CLEARANCE.M8!.medium / 2000, depth: T, at: [x / 1000, T / 2, z / 1000] as V3, dir: [0, -1, 0] as V3 })) } : {}) };
      const r = imprint({ name: 'host', parts: [plate] }, c.asking, [im.at[0] / 1000, 1, im.at[1] / 1000], [0, -1, 0]);
      if (im.expect.ok) { expect((r as Refusal).refused, `case ${c.case} passes: ${(r as Refusal).why ?? ''}`).toBeUndefined(); expect((r as Imprinted).checks.every((k) => k.ok), `case ${c.case}: every check holds`).toBe(true); expect((r as Imprinted).checks.map((k) => k.check)).toEqual(['edge distance', 'room', 'depth']); continue; }
      const f = r as Refusal; expect(f.refused, `case ${c.case} refused`).toBe(true); expect([f.rule, f.need, f.have], `case ${c.case}: ${f.why}`).toEqual([im.expect.refused, im.expect.need, im.expect.have]); expect(f.source.length).toBeGreaterThan(3); }
  });
  // (an interface stood on any point of any surface (spec 01, I6): on a box's top, a cylinder's side and a sloped face (a
  // box turned inside a turned group, met exactly; and a wedge's slope, met on the views' mesh), the frame's n within 0.5°
  // of the surface's normal and the hole within 0.1 mm of where the ray points, each worked out by hand; turned about n by
  // what is asked)
  it('an interface stands on a box\'s top, a cylinder\'s side and a sloped face', async () => {
    const { geometry } = await import('../../src/nexus/view/kit3d');
    const deg = (a: number[], b: number[]) => (Math.acos(Math.min(1, Math.max(-1, a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!))) * 180) / Math.PI, gap = (a: number[], b: number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
    const S = Math.sin(Math.PI / 6), C = Math.cos(Math.PI / 6), zc = 0.004, xc = Math.sqrt(0.02 ** 2 - zc ** 2), yTop = 0.1 + (0.01 - (0.005 * -S)) / C;
    const cases: { what: string; host: Part; from: V3; dir: V3; at: V3; n: V3 }[] = [
      { what: 'a box\'s top', host: { name: 'h', parts: [{ name: 'block', shape: { box: [0.1, 0.02, 0.06] }, at: [0, 0, 0] }] }, from: [0.012, 0.5, -0.007], dir: [0, -1, 0], at: [0.012, 0.01, -0.007], n: [0, 1, 0] },
      { what: 'a cylinder\'s side', host: { name: 'h', parts: [{ name: 'round bar', shape: { cyl: [0.02, 0.1] }, at: [0, 0, 0] }] }, from: [0.5, 0.013, zc], dir: [-1, 0, 0], at: [xc, 0.013, zc], n: [xc / 0.02, 0, zc / 0.02] },
      { what: 'a sloped face (a box turned 30° in a turned group)', host: { name: 'h', parts: [{ name: 'tilted', at: [0.3, 0.1, 0], rot: [0, 0, Math.PI / 6], parts: [{ name: 'tilted block', shape: { box: [0.1, 0.02, 0.06] }, at: [0, 0, 0] }] }] }, from: [0.305, 1, 0.01], dir: [0, -1, 0], at: [0.305, yTop, 0.01], n: [-S, C, 0] },
      { what: 'a sloped face (a wedge, its mesh)', host: { name: 'h', parts: [{ name: 'wedge', shape: { prism: { pts: [[0, 0], [0.1, 0], [0, 0.05]], L: 0.04 } }, at: [0, 0, 0] }] }, from: [0.03, 1, 0.005], dir: [0, -1, 0], at: [0.03, 0.035, 0.005], n: [0.05 / Math.hypot(0.05, 0.1), 0.1 / Math.hypot(0.05, 0.1), 0] },
    ];
    for (const c of cases) { const f = standOn(c.host, c.from, c.dir, { geometry: (sh) => geometry(sh, undefined) })!; expect(f, `${c.what}: met`).toBeTruthy();
      expect(deg(f.n, c.n), `${c.what}: n within 0.5° of the surface's normal`).toBeLessThan(0.5); expect(gap(f.at, c.at), `${c.what}: where pointed within 0.1 mm`).toBeLessThan(0.0001);
      expect(Math.abs(f.u[0]! * f.n[0]! + f.u[1]! * f.n[1]! + f.u[2]! * f.n[2]!), `${c.what}: u in the surface`).toBeLessThan(1e-9); }
    // (a turned solid drawn top-down, met on its near wall (it was met on its far wall through the views' mesh: the
    // evaluator, 2026-11-01), and now exactly, its profile turned, not its mesh (a keyway's lead needs it: spec 01, I17);
    // and of two pieces stacked, the one the ray meets first)
    const lathe = standOn({ name: 'h', parts: [{ name: 'turned', shape: { lathe: [[0, 0.08], [0.02, 0.08], [0.02, 0], [0, 0]] }, at: [0, 0, 0] }] }, [0.5, 0.04, 0], [-1, 0, 0], { geometry: (sh) => geometry(sh, undefined) })!;
    expect([lathe.at[0]! > 0.019, deg(lathe.n, [1, 0, 0]) < 0.5, lathe.exact], 'a lathe drawn top-down: its near wall, square to it, met exactly').toEqual([true, true, true]);
    const stack = standOn({ name: 'h', parts: [{ name: 'low', shape: { box: [0.1, 0.02, 0.1] }, at: [0, 0, 0] }, { name: 'high', shape: { box: [0.1, 0.02, 0.1] }, at: [0, 0.05, 0] }] }, [0, 1, 0], [0, -1, 0])!;
    expect([stack.piece, +stack.at[1]!.toFixed(6)], 'the piece met first').toEqual(['high', 0.06]);
    const turned = standOn(cases[0]!.host, cases[0]!.from, cases[0]!.dir, { turn: Math.PI / 2 })!, plain = standOn(cases[0]!.host, cases[0]!.from, cases[0]!.dir)!;
    expect(deg(turned.u, plain.u), 'turned a quarter about n').toBeCloseTo(90, 6); expect(standOn(cases[0]!.host, [0, 0.5, 0], [0, 1, 0]), 'a ray that meets nothing').toBeNull();
  });
  // (an imprint applied (spec 01, I8; R9): case 1's negative cut into its plate (the counterbore a turned cut), its keep a
  // zone, and the plate given the mirror interface: a port of holes the M8 bolt's own interface finds by fit(), as the bolt
  // found its hole; an M10 does not fit it; the imprint recorded, the thing asked not changed)
  it('after an imprint, the host\'s new interface finds its bolt by fit()', () => {
    const plate: Part = { name: 'plate', item: 'plate 100x10x100', mat: 'steel-low', shape: { box: [0.1, 0.01, 0.1] }, at: [0, 0, 0] }, host: Part = { name: 'host', parts: [plate] };
    const im = imprint(host, { kind: 'thread.external', thread: 'M8', head: 'socket', through: true }, [0.01, 1, -0.02], [0, -1, 0]) as Imprinted; expect((im as unknown as Refusal).refused).toBeUndefined();
    const done = applyImprint(host, im, 'M8 cap screw'), got = done.part.parts![0]!;
    expect(host.parts![0]!.cuts, 'the thing asked is not changed').toBeUndefined();
    expect(got.cuts!.map((c) => [+(c.r * 2000).toFixed(2), c.prof?.length ?? 0, c.dir.map((x) => +x.toFixed(6))]), 'the counterbored hole cut, turned, down into the plate').toEqual([[9, 4, [0, -1, 0]]]);
    expect(got.cuts![0]!.at.map((x) => +x.toFixed(6)), 'where it was put').toEqual([0.01, 0.005, -0.02]);
    expect(got.keep?.length, 'its keep a zone').toBe(1); expect(got.imprints?.map((x) => [x.of, x.mirror]), 'the imprint recorded').toEqual([['M8 cap screw', 'hole.clearance']]);
    const boltOf = (w: string) => portOfInterface(interfacesOf(use(w)).list.find((x) => x.kind === 'thread.external')!)!, bolt = boltOf('bolt M8x30'), big = boltOf('bolt M10x30');
    // (the host's own new interface, read off its piece (the port applyImprint returns was read before: the evaluator,
    // 2026-11-01))
    const own = got.ports!.find((p) => p.name === done.port.name)!; expect(own, 'the host has its new interface').toBeTruthy();
    expect(own.sex, 'it gains holes').toBe('holes'); expect(fit(own, bolt), 'the hole finds its bolt').toEqual({ turn: expect.any(Number) }); expect(typeof fit(own, big), 'an M10 does not fit an M8\'s hole').toBe('string');
    // (a tapped hole and an insert's: the host gains threads its screw finds; each of its size only)
    for (const [mat, t, asking, w, other, kind] of [['steel-low', 0.02, { kind: 'thread.external', thread: 'M6', through: false }, 'bolt M6x30', 'bolt M8x30', 'hole.tapped'], ['pla', 0.01, { kind: 'thread.external', thread: 'M4', through: false }, 'bolt M4x20', 'bolt M5x20', 'hole.insert']] as const) {
      const h: Part = { name: 'host', parts: [{ name: 'block', item: 'block', mat, shape: { box: [0.1, t, 0.1] }, at: [0, 0, 0] }] }, ti = imprint(h, asking as Asking, [0, 1, 0], [0, -1, 0]) as Imprinted;
      expect((ti as unknown as Refusal).refused, `${kind}: ${(ti as unknown as Refusal).why ?? ''}`).toBeUndefined(); const tp = applyImprint(h, ti, w).part.parts![0]!, port = tp.ports![0]!;
      expect([tp.imprints![0]!.mirror, port.sex, port.thread], `${kind}: the host gains threads`).toEqual([kind, 'threads', w.split(' ')[1]!.split('x')[0]]);
      expect(fit(port, boltOf(w)), `${kind}: its screw finds it`).toEqual({ turn: expect.any(Number) }); expect(typeof fit(port, boltOf(other)), `${kind}: another size does not`).toBe('string'); }
    // (on a turned piece in a turned group: the cut where the ray met it and along the ray, in the piece's own frame)
    const tilted: Part = { name: 'host', parts: [{ name: 'arm', at: [0.2, 0.1, -0.05], rot: [0.3, 0.5, 0], parts: [{ name: 'tilted plate', item: 'plate', mat: 'steel-low', shape: { box: [0.1, 0.01, 0.1] }, at: [0.01, 0, 0], rot: [0, 0, 0.4] }] }] };
    const ray = new THREE.Vector3(0.21, 0.6, -0.04), tim = imprint(tilted, { kind: 'thread.external', thread: 'M8', head: 'socket', through: true }, ray.toArray() as V3, [0, -1, 0]) as Imprinted;
    const tg = applyImprint(tilted, tim, 'M8 cap screw').part, piece = piecesIn(tg).find((q) => q.p.name === 'tilted plate')!, c = piece.p.cuts![0]!;
    expect(new THREE.Vector3(...c.at).applyMatrix4(piece.m).distanceTo(new THREE.Vector3(...tim.frame.at)), 'the cut where the ray met the turned plate').toBeLessThan(1e-9);
    expect(new THREE.Vector3(...c.dir).transformDirection(piece.m).dot(new THREE.Vector3(...tim.frame.n)), 'and into it, against its outward normal').toBeCloseTo(-1, 9);
    // (two imprints on one piece: two ports, named apart)
    const two = applyImprint(done.part, imprint(done.part, { kind: 'thread.external', thread: 'M8', head: 'socket', through: true }, [-0.03, 1, 0.03], [0, -1, 0]) as Imprinted, 'M8 cap screw').part.parts![0]!;
    expect(two.ports!.map((p) => p.name), 'two ports, named apart').toEqual(['M8 cap screw (imprinted)', 'M8 cap screw (imprinted) 2']);
  });
  // (an imprint keeps to its face by what the face is (spec 01, I9; R10; evaluation case 10): the plate made 10 mm taller,
  // the imprint is made again on its top, its hole through the new depth, the old cut gone; the plate made too narrow for
  // where it stood, or made round, it is lost and said so, never moved)
  it('a box made taller keeps its imprint on the top; a face removed says it is lost', async () => {
    const { geometry } = await import('../../src/nexus/view/kit3d');
    const c10 = (JSON.parse(readFileSync(join(root, 'evals/interfaces/cases.json'), 'utf8')) as { cases: { case: number; asking: Asking; host: { material: string }; reapply?: { plate: number[]; at: number[]; taller: number[]; narrower: number[]; expect: { kept_top: number; kept_depth: number; cuts: number } } }[] }).cases.find((c) => c.case === 10)!;
    const r = c10.reapply!, box = (b: number[]): Part['shape'] => ({ box: b.map((x) => x / 1000) as V3 }), withShape = (h: Part, sh: Part['shape']): Part => ({ ...h, parts: [{ ...h.parts![0]!, shape: sh }] });
    const host: Part = { name: 'host', parts: [{ name: 'plate', item: 'plate', mat: c10.host.material, shape: box(r.plate), at: [0, 0, 0] }] };
    const im = imprint(host, c10.asking, [r.at[0]! / 1000, 1, r.at[1]! / 1000], [0, -1, 0]) as Imprinted, done = applyImprint(host, im, 'M8 cap screw').part;
    const taller = reapplyImprints(withShape(done, box(r.taller))), tp = taller.part.parts![0]!;
    expect([taller.kept, taller.lost], 'kept').toEqual([['M8 cap screw'], []]);
    expect(tp.cuts!.length, 'one cut: the old one gone').toBe(r.expect.cuts);
    expect([+(tp.cuts![0]!.at[1] * 1000).toFixed(4), +(tp.cuts![0]!.depth * 1000).toFixed(4), +(tp.cuts![0]!.at[0] * 1000).toFixed(4), +(tp.cuts![0]!.at[2] * 1000).toFixed(4)], 'on the new top, through the new depth, where it stood').toEqual([r.expect.kept_top, r.expect.kept_depth, r.at[0], r.at[1]]);
    expect([tp.ports?.length, tp.imprints?.length, tp.imprints?.[0]?.lost], 'its port and its record once').toEqual([1, 1, undefined]);
    // (a lid set over it: the imprint kept on its own plate, not moved onto the lid (it hopped onto one: the evaluator,
    // 2026-11-01))
    // (a lid 43 mm over it, clear of the key's 24 mm of room: kept on its own plate; a lid 13 mm over it, in that room: its
    // room check refuses it, lost and said so)
    const lid = (y: number): Part => ({ ...done, parts: [done.parts![0]!, { name: 'lid', item: 'lid', mat: 'steel-low', shape: { box: [0.1, 0.004, 0.1] }, at: [0, y, 0] }] }), kl = reapplyImprints(lid(0.05)), low = reapplyImprints(lid(0.02));
    expect([kl.kept, kl.lost, kl.part.parts![1]!.cuts?.length ?? 0, kl.part.parts![0]!.cuts?.length], 'a lid well over it: kept on its own plate, the lid not cut').toEqual([['M8 cap screw'], [], 0, 1]);
    expect([low.kept, low.lost.map((x) => /room/.test(x.why))], 'a lid in its key\'s room: lost, by its room check').toEqual([[], [true]]);
    // (a hex head asks no key's room, so its own-piece check alone holds it: a lid 0.05 mm over the plate, the ray from just
    // above the plate's face would meet the lid first; lost, said so, the lid not cut (only the socket head's room check
    // held this before: the evaluator, 2026-11-01); and its keep zones made again at the new top, not kept from before)
    const hexDone = applyImprint(host, imprint(host, { ...c10.asking, head: 'hex' } as Asking, [r.at[0]! / 1000, 1, r.at[1]! / 1000], [0, -1, 0]) as Imprinted, 'M8 hex bolt').part, top = r.plate[1]! / 2000;
    const hexLid = reapplyImprints({ ...hexDone, parts: [hexDone.parts![0]!, { name: 'lid', item: 'lid', mat: 'steel-low', shape: { box: [0.1, 0.004, 0.1] }, at: [0, top + 0.00005 + 0.002, 0] }] });
    expect([hexLid.kept, hexLid.lost.length, hexLid.part.parts![1]!.cuts?.length ?? 0], `a hex head under a lid 0.05 mm over it: lost, the lid not cut (${hexLid.lost.map((x) => x.why).join('; ')})`).toEqual([[], 1, 0]);
    const keeps = (p: Part) => (p.keep ?? []).map((k) => +((k.at[1] ?? 0) * 1000).toFixed(3));
    expect(keeps(tp).length, 'its keep zone made again, once').toBe(done.parts![0]!.keep!.length); expect(keeps(tp), 'at the new top, not where the old top was').not.toEqual(keeps(done.parts![0]!));
    // (made too thin for its counterbore: its checks refuse it, so it is lost and said so; made into sub-parts, it has no
    // surface: lost; first put on a step below the piece's top, it keeps to its step when nothing changes, and is lost when
    // the step is raised above... (a face the farthest out at first, made not so, is lost))
    const thin = reapplyImprints(withShape(done, box([100, 6, 100]))); expect([thin.kept, thin.lost.map((x) => x.why.slice(0, 26))], 'too thin for its counterbore').toEqual([[], ['its checks refuse it there']]);
    const split = reapplyImprints({ ...done, parts: [{ ...done.parts![0]!, shape: undefined, parts: [{ name: 'half', shape: box([50, 10, 100]), at: [0.025, 0, 0] }] }] }); expect(split.lost.map((x) => x.why), 'made into sub-parts').toEqual(['the piece it stood on has no surface of its own now']);
    const step: Part['shape'] = { prism: { pts: [[-0.05, -0.005], [0.05, -0.005], [0.05, 0.005], [0, 0.005], [0, 0.015], [-0.05, 0.015]], L: 0.1 } };
    const stepHost: Part = { name: 'host', parts: [{ name: 'stepped', item: 'stepped', mat: 'steel-low', shape: step, at: [0, 0, 0] }] };
    const sim = imprint(stepHost, c10.asking, [0.025, 1, 0.01], [0, -1, 0], { geometry: (sh) => geometry(sh, undefined) }) as Imprinted; expect((sim as unknown as Refusal).refused, `on the lower step: ${(sim as unknown as Refusal).why ?? ''}`).toBeUndefined();
    const onStep = applyImprint(stepHost, sim, 'M8 cap screw').part, same = reapplyImprints(onStep, { geometry: (sh) => geometry(sh, undefined) });
    expect([same.kept, same.lost], 'on a step, nothing changed: kept').toEqual([['M8 cap screw'], []]);
    const raised = reapplyImprints(withShape(done, { prism: { pts: [[-0.05, -0.005], [0.05, -0.005], [0.05, 0.005], [0.02, 0.005], [0.02, 0.015], [-0.05, 0.015]], L: 0.1 } }), { geometry: (sh) => geometry(sh, undefined) });
    expect([raised.kept, raised.lost.map((x) => x.why.slice(0, 33))], 'the top it stood on, the farthest out, now below another of its normal').toEqual([[], ['another face with its normal lies']]);
    for (const [what, sh] of [['narrower', box(r.narrower)], ['round', { sphere: 0.05 }]] as const) { const g = reapplyImprints(withShape(done, sh)), gp = g.part.parts![0]!;
      expect([g.kept, g.lost.map((x) => x.of)], `${what}: lost`).toEqual([[], ['M8 cap screw']]); expect(g.lost[0]!.why.length).toBeGreaterThan(20);
      expect([gp.cuts?.length ?? 0, gp.ports?.length ?? 0, gp.imprints?.[0]?.lost], `${what}: nothing of it moved anywhere; its record says it is lost`).toEqual([0, 0, g.lost[0]!.why]); }
  });
  // (the fastener for a stack (spec 01, I10): evaluation case 8 chooses its bolt; a tapped and an insert stack each the
  // catalogue's screw, said why; mate() lays its fasteners through it; a bolt's bore is ISO 273's; and the four machines'
  // fasteners as they were before (tests/nexus/fasteners.before.json, taken at a8ecae3, before the change; less, from
  // 2026-11-02, the oil pan bolts that were drawn through the crank where it passes the pan's ends: fault D24))
  it('the fastener for a stack: case 8 chooses its bolt', () => {
    const c8 = (JSON.parse(readFileSync(join(root, 'evals/interfaces/cases.json'), 'utf8')) as { cases: { case: number; fastener?: { thread: string; plies: number[]; how: 'through'; expect: Record<string, unknown> } }[] }).cases.find((c) => c.case === 8)!.fastener!;
    const f = fastenerFor({ thread: c8.thread, plies: c8.plies.map((x) => x / 1000), how: c8.how }) as Fastener;
    expect({ words: f.words, std: f.std, L: f.L, nut: f.nut, washers: f.washers }, f.why.join('; ')).toEqual(c8.expect);
    expect(boltedJoint('M8', 16).parts!.find((p) => /bolt/.test(p.name))!.name, 'the joint lays the same bolt').toMatch(/M8 × 30 hex bolt/);
    const tap = fastenerFor({ thread: 'M6', plies: [0.006, 0.02], how: 'tapped', host: 'al-6061' }) as Fastener, ins = fastenerFor({ thread: 'M4', plies: [0.003, 0.012], how: 'insert' }) as Fastener;
    expect([tap.words, tap.why.some((w) => /Bossard/.test(w))], 'tapped into 6061: engaged 12 mm, the screw 6 + 12 = 18 mm or the next sold').toEqual(['screw M6x18', true]);
    expect(ins.words, 'into a TC-M4x8.1: from 3 + 7.1 = 10.1 to 3 + 9.1 = 12.1 mm, so 12').toBe('screw M4x12');
    expect(boreThrough({ name: 'plate', shape: { box: [0.1, 0.01, 0.1] }, at: [0, 0, 0] }, use('bolt M8x30')).says, 'a bolt\'s bore ISO 273 medium').toMatch(/9\.0 mm \(ISO 273 medium for M8\)/);
  }, 300_000);
  // (a shared pattern and the changes that follow (spec 01, I11; evaluation case 9): a board where the bore feeds the bolt
  // circle's radius, one circle both the flange's and the cover's holes read, and the bolts laid from it; the bore widened
  // 40 to 50 mm, the radius, the circle, both parts' holes and the bolts follow, in the engine's order, each saying what it
  // made, and the two plates are not made again)
  it('the bore widened: the bolt circle, the bolts and the cover\'s holes follow', async () => {
    const c9 = (JSON.parse(readFileSync(join(root, 'evals/interfaces/cases.json'), 'utf8')) as { cases: { case: number; follows?: { thread: string; count: number; bore: number[]; flange: number; cover: number; expect: { r: number[]; bolt: string; holes: number; ran: string[]; cached: string[] } } }[] }).cases.find((c) => c.case === 9)!.follows!;
    const b = emptyBoard('the cover follows the bore');
    placeBlock(b, 'in.number', 0, 0, { value: c9.bore[0]! / 1000, unit: 'm' }, 'bore'); placeBlock(b, 'relation.boltcircle', 200, 0, { thread: c9.thread }, 'circle radius'); placeBlock(b, 'pattern.circle', 400, 0, { thread: c9.thread, count: c9.count }, 'bolt circle');
    placeBlock(b, 'shape.cyl', 0, 200, { name: 'flange', mat: 'steel-low' }, 'flange'); placeBlock(b, 'shape.cyl', 0, 400, { name: 'cover', mat: 'steel-low' }, 'cover');
    placeBlock(b, 'in.number', -200, 200, { value: 0.08, unit: 'm' }, 'plate radius'); placeBlock(b, 'in.number', -200, 300, { value: c9.flange / 1000, unit: 'm' }, 'flange thickness'); placeBlock(b, 'in.number', -200, 400, { value: c9.cover / 1000, unit: 'm' }, 'cover thickness');
    placeBlock(b, 'imprint.pattern', 600, 200, {}, 'flange holes'); placeBlock(b, 'imprint.pattern', 600, 400, {}, 'cover holes'); placeBlock(b, 'fasten.pattern', 600, 0, {}, 'bolts');
    for (const [f, o, t, i] of [['bore', 'value', 'circle radius', 'bore'], ['circle radius', 'r', 'bolt circle', 'r'], ['plate radius', 'value', 'flange', 'r'], ['flange thickness', 'value', 'flange', 'h'], ['plate radius', 'value', 'cover', 'r'], ['cover thickness', 'value', 'cover', 'h'],
      ['flange', 'part', 'flange holes', 'part'], ['bolt circle', 'pattern', 'flange holes', 'pattern'], ['cover', 'part', 'cover holes', 'part'], ['bolt circle', 'pattern', 'cover holes', 'pattern'], ['bolt circle', 'pattern', 'bolts', 'pattern'], ['flange thickness', 'value', 'bolts', 't1'], ['cover thickness', 'value', 'bolts', 't2']] as const) wire(b, f, o, t, i);
    const e = new Engine(b); await e.run(); const out = (id: string) => e.state.get(id)!.out as Record<string, unknown>;
    const radii = (p: Part) => (p.cuts ?? []).map((c) => +(Math.hypot(c.at[0], c.at[2]) * 1000).toFixed(3));
    const look = () => ({ r: +((out('circle radius').r as number) * 1000).toFixed(3), flange: radii(out('flange holes').part as Part), cover: radii(out('cover holes').part as Part), bolt: out('bolts').bolt, at: (out('bolts').at as { x: number; z: number }[]).map((a) => +(Math.hypot(a.x, a.z) * 1000).toFixed(3)) });
    const first = look(); expect(first, 'at 40 mm').toEqual({ r: c9.expect.r[0], flange: Array(c9.expect.holes).fill(c9.expect.r[0]), cover: Array(c9.expect.holes).fill(c9.expect.r[0]), bolt: c9.expect.bolt, at: Array(c9.expect.holes).fill(c9.expect.r[0]) });
    const runs0 = new Map(e.sequence.map((id) => [id, e.state.get(id)!.runs]));
    b.nodes.bore!.set = { ...b.nodes.bore!.set, value: c9.bore[1]! / 1000 }; e.touch('bore'); await e.run();
    expect(look(), 'widened to 50 mm, everything that reads it follows').toEqual({ r: c9.expect.r[1], flange: Array(c9.expect.holes).fill(c9.expect.r[1]), cover: Array(c9.expect.holes).fill(c9.expect.r[1]), bolt: c9.expect.bolt, at: Array(c9.expect.holes).fill(c9.expect.r[1]) });
    // (the run log: the nodes that ran again, in the engine's order, and what each said; the plates not made again)
    const ran = e.sequence.filter((id) => e.state.get(id)!.runs > runs0.get(id)!), log = ran.map((id) => `${id}: ${String((e.state.get(id)!.out as { says?: unknown } | undefined)?.says ?? e.state.get(id)!.out?.value ?? '')}`);
    expect(ran, log.join('\n')).toEqual(c9.expect.ran); for (const id of c9.expect.cached) expect(e.state.get(id)!.runs, `${id} not made again`).toBe(runs0.get(id));
    expect(log.slice(1).every((l) => /\d/.test(l)), 'each step says what it made').toBe(true);
    expect((out('cover holes').part as Part).ports!.length, 'the cover\'s holes a port its bolts find').toBe(c9.expect.holes);
  }, 120_000);
  // (joints solved together (spec 01, I12; R13; design §2.7): a NEMA 17 motor on its plate by its face and its four holes,
  // 19 equations whose rank is 6, so 0 freedom left (a count of equations would say 13 too many); the same motor given
  // upside down reported turned end for end and still placed; a lid on a hinge 1 freedom left, the turn about its pin,
  // whether the hinge is one revolute joint or a pin in a knuckle and the knuckles' faces (7 equations, rank 5); a latch
  // 5 mm off the lid's arc fights the hinge and the two are named, the handle fixed on the lid not; a misdrilled hole
  // fights its neighbour and is the one that, left out alone, lets the rest hold)
  it('joints solved together: flipped, freedom left by rank, the fewest that fight named', () => {
    const f = NEMA_FACE['17']!, h = f.holes / 2 / 1000, sq: [number, number][] = [[h, h], [-h, h], [-h, -h], [h, -h]];
    const plate = (pattern = sq): Part => ({ name: 'plate', ports: [{ name: 'motor mount', sex: 'holes', thread: f.thread, pattern, at: [0, 0.003, 0], n: [0, 1, 0], u: [1, 0, 0], t: 0.006, std: 'NEMA 17' }] });
    const motor = (rot: V3): Part => ({ name: 'motor', at: [0.05, 0.08, 0.02], rot, ports: [{ name: 'face', sex: 'threads', thread: f.thread, pattern: sq, at: [0, -0.02, 0], n: [0, -1, 0], u: [1, 0, 0], t: 0.0045, std: 'NEMA 17' }] });
    const faceOf = (s: JointsSolved) => { const p = s.poses.motor!, q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rot)); return { at: new THREE.Vector3(0, -0.02, 0).applyQuaternion(q).add(new THREE.Vector3(...p.at)), n: new THREE.Vector3(0, -1, 0).applyQuaternion(q) }; };
    for (const [rot, turned] of [[[0.3, 0.5, 0.1], false], [[Math.PI, 0.2, 0], true]] as [V3, boolean][]) {
      const m = motor(rot), js = jointsOfPorts(plate(), 'motor mount', m, 'face') as Joint[], s = solveJoints([plate(), m], js, { fixed: ['plate'] });
      expect(js.map((j) => j.kind), 'its face and its four holes').toEqual(['planar', 'cylindrical', 'cylindrical', 'cylindrical', 'cylindrical']);
      expect([s.equations, s.rank, s.unknowns, s.freedom], 'a motor on four holes: 19 equations of rank 6, 0 freedom left').toEqual([19, 6, 6, 0]);
      expect(s.joints.every((r) => r.holds && r.mm < 1e-3 && r.deg < 1e-3), s.says).toBe(true);
      const face = faceOf(s); expect(face.at.distanceTo(new THREE.Vector3(0, 0.003, 0)), 'its face on the plate\'s').toBeLessThan(1e-9); expect(face.n.y, 'facing it').toBeCloseTo(-1, 9);
      expect(s.flipped, turned ? 'given upside down: reported turned end for end' : 'given the right way up: not').toEqual(turned ? ['motor'] : []);
      expect(s.joints.every((r) => r.flipped === (turned ? 'motor' : null)), 'on each joint it met so').toBe(true);
      if (turned) expect(s.says).toContain('turned end for end to meet: motor');
    }
    // (a hinge: one revolute joint; or a pin in a knuckle and the knuckles' faces against each other)
    // (the lid given 30 mm along its pin from where its hinge holds it, turned 0.2 rad about it: drawn back along the pin, its turn kept)
    const box: Part = { name: 'box' }, lid: Part = { name: 'lid', at: [0.03, 0.1 - 0.1 * Math.sin(0.2), -0.1 + 0.1 * Math.cos(0.2)], rot: [0.2, 0, 0] }, handle: Part = { name: 'handle', at: [0, 0.13, 0.11] };
    const knuckle = { a: { part: 'box', frame: { at: [0, 0.1, -0.1] as V3, n: [1, 0, 0] as V3, u: [0, 1, 0] as V3 } }, b: { part: 'lid', frame: { at: [0, 0, -0.1] as V3, n: [-1, 0, 0] as V3, u: [0, 1, 0] as V3 } } };
    const hinge: Joint = { name: 'hinge', kind: 'revolute', ...knuckle };
    for (const js of [[hinge], [{ name: 'pin in knuckle', kind: 'cylindrical', ...knuckle }, { name: 'knuckle faces', kind: 'planar', ...knuckle }]] as Joint[][]) {
      const s = solveJoints([box, lid], js, { fixed: ['box'] });
      expect([s.equations, s.rank, s.freedom], `a hinge has 1 (${js.length} joint${js.length > 1 ? 's' : ''})`).toEqual([js.length === 1 ? 5 : 7, 5, 1]);
      expect(s.free, 'the turn about its pin').toEqual(['the lid turns about (1, 0, 0) through (0, 100, -100) mm']);
      expect(s.joints.every((r) => r.holds) && s.fight === null, s.says).toBe(true);
      expect(s.poses.lid!.rot[0], 'what the hinge leaves free, left as it was given').toBeCloseTo(0.2, 4); expect(s.poses.lid!.at[0], 'drawn back along its pin').toBeCloseTo(0, 9);
    }
    // (two fighting joints named: a latch 5 mm off the lid's arc; the handle fixed on the lid is not in the fight)
    const latch: Joint = { name: 'latch', kind: 'ball', a: { part: 'box', frame: { at: [0, 0.1, 0.105], n: [0, 1, 0], u: [1, 0, 0] } }, b: { part: 'lid', frame: { at: [0, 0, 0.1], n: [0, -1, 0], u: [1, 0, 0] } } };
    const grip: Joint = { name: 'handle on lid', kind: 'fixed', a: { part: 'lid', frame: { at: [0, 0.005, 0.1], n: [0, 1, 0], u: [1, 0, 0] } }, b: { part: 'handle', frame: { at: [0, 0, 0], n: [0, -1, 0], u: [1, 0, 0] } } };
    const s = solveJoints([box, lid, handle], [hinge, grip, latch], { fixed: ['box'] });
    expect(s.fight, 'the fewest that fight').toEqual(['hinge', 'latch']); expect(s.leaveOut, 'either left out, the rest hold').toEqual(['hinge', 'latch']);
    expect(s.joints.filter((r) => !r.holds).map((r) => r.joint), 'the two that do not hold').toEqual(['hinge', 'latch']);
    expect(s.joints.find((r) => r.joint === 'hinge')!.mm + s.joints.find((r) => r.joint === 'latch')!.mm, 'their 5 mm shared between them').toBeCloseTo(5, 2);
    expect(s.joints.find((r) => r.joint === 'handle on lid')!.holds, 'the handle holds to its lid').toBe(true);
    // (two hinges not in line, the second's pin 1° off the first's: they bind, each off in degrees, and are named)
    const tilt = (1 * Math.PI) / 180, second: Joint = { name: 'second hinge', kind: 'revolute', a: { part: 'box', frame: { at: [0.2, 0.1, -0.1], n: [Math.cos(tilt), Math.sin(tilt), 0], u: [-Math.sin(tilt), Math.cos(tilt), 0] } }, b: { part: 'lid', frame: { at: [0.2, 0, -0.1], n: [-1, 0, 0], u: [0, 1, 0] } } };
    const bind = solveJoints([box, lid], [hinge, second], { fixed: ['box'] });
    expect(bind.fight, 'they bind').toEqual(['hinge', 'second hinge']); expect(bind.joints.every((r) => r.deg > 0.2 && r.deg < 1), `each off in degrees: ${bind.says}`).toBe(true);
    // (a misdrilled hole: 0.5 mm off; it fights its neighbour across 31 mm, and leaving it out alone, the rest hold)
    const off = sq.map((p, i) => (i === 2 ? [p[0] + 0.0005, p[1]] : p) as [number, number]), m = motor([0.3, 0.5, 0.1]);
    expect(typeof jointsOfPorts(plate(off), 'motor mount', m, 'face'), 'fit refuses a pattern not its mirror').toBe('string');
    const js: Joint[] = [{ name: 'face', kind: 'planar', a: { part: 'plate', port: 'motor mount' }, b: { part: 'motor', port: 'face' } }, ...[0, 1, 2, 3].map((i) => ({ name: `hole ${i + 1}`, kind: 'cylindrical' as const, a: { part: 'plate', port: 'motor mount', hole: i }, b: { part: 'motor', port: 'face', hole: [0, 3, 2, 1][i]! } }))];
    const mis = solveJoints([plate(off), m], js, { fixed: ['plate'] });
    expect(mis.fight, 'hole 3 and the hole it fights').toEqual(['hole 3', 'hole 4']); expect(mis.leaveOut, 'hole 3 alone').toEqual(['hole 3']);
    // (a system whose joints all hold, by construction (two hinges and a pin, its frames made from true poses): one descent
    // from where they were given stopped short and named a false fight; tried again from other starts, all hold (one in a
    // thousand random systems: the evaluator found it, 2026-11-01))
    const t36 = {"parts":[{"name":"p0","at":[0.00733737946,0.0875690538,0.206659412],"rot":[-0.866895854,0.0115549056,-2.28481295]},{"name":"p1","at":[0.162353048,0.140656579,0.0293165803],"rot":[1.17615607,-0.393097186,-0.0432968281]},{"name":"p2","at":[0.276647839,0.277804935,0.18499378],"rot":[-0.196496364,-0.0561651913,0.194130407]}],"js":[{"name":"j0","kind":"revolute","a":{"part":"p0","frame":{"at":[-0.533740691,0.38231909,0.304641937],"n":[0.919255859,-0.261917381,0.293884248],"u":[0.392792197,0.560707029,-0.72891832]}},"b":{"part":"p1","frame":{"at":[0.333605949,0.565423223,-0.352783072],"n":[-0.704708631,-0.0966765205,0.70287936],"u":[-0.668609067,-0.240959564,-0.703491581]}}},{"name":"j1","kind":"revolute","a":{"part":"p0","frame":{"at":[-0.454008467,0.265730751,0.336044435],"n":[-0.669669226,0.618976916,0.410378733],"u":[0.740952951,0.594298935,0.31272592]}},"b":{"part":"p2","frame":{"at":[-0.699295279,0.649870195,-0.337985602],"n":[0.434713138,0.281121759,-0.855567089],"u":[-0.720206672,-0.461844422,-0.517689172]}}},{"name":"j2","kind":"cylindrical","a":{"part":"p2","frame":{"at":[-0.813344521,0.587949736,-0.408277598],"n":[0.624975664,0.605590201,0.492611336],"u":[-0.231889308,-0.458530646,0.857891016]}},"b":{"part":"p1","frame":{"at":[0.474157521,0.621970292,-0.49358501],"n":[-0.151577464,0.55953203,-0.814830154],"u":[-0.699066693,0.52211473,0.488571353]}}}]} as { parts: Part[]; js: Joint[] }, c36 = solveJoints(t36.parts, t36.js, { fixed: ['p0'] });
    expect([c36.fight, c36.joints.every((r) => r.holds)], `consistent: no fight (${c36.says})`).toEqual([null, true]);
    // (a ball holds only a point: its n says nothing, so a part on one is never said to be flipped)
    const ball = solveJoints([{ name: 'A' }, { name: 'B', at: [0.1, 0, 0] }], [{ name: 'socket', kind: 'ball', a: { part: 'A', frame: { at: [0, 0, 0], n: [0, 1, 0], u: [1, 0, 0] } }, b: { part: 'B', frame: { at: [0, 0, 0], n: [0, 1, 0], u: [1, 0, 0] } } }], { fixed: ['A'] });
    expect([ball.flipped, ball.freedom], 'a ball: not flipped, three turns left').toEqual([[], 3]);
    // (nothing fixed: the first part held where it stands, and said; a slider leaves its slide)
    const sl = solveJoints([{ name: 'rail' }, { name: 'cart', at: [0.1, 0.02, 0.01] }], [{ name: 'slide', kind: 'slider', a: { part: 'rail', frame: { at: [0, 0.01, 0], n: [0, 0, 1], u: [0, 1, 0] } }, b: { part: 'cart', frame: { at: [0, 0, 0], n: [0, 0, -1], u: [0, 1, 0] } } }]);
    expect([sl.held, sl.freedom, sl.free], 'held, and its slide').toEqual([['rail'], 1, ['the cart slides along (0, 0, 1)']]);
  });
  // (the interface tools as nodes on a board (spec 01, I13): "Paste a bolt onto anything" stands one M8 cap screw on a
  // plate from above and on a round boss's side, each cut by its standards and the screw seated by its joints (the turn
  // about its axis left), and refuses the steel angle's 5 mm leg by its counterbore's rule, nothing cut; "The cover follows
  // the bore" puts the cover on the flange by its six holes (0 freedom left, every joint holding) and, the bore widened
  // 40 to 50 mm, the holes and the cover's joints follow; every node of both runs, none failing)
  it('the interface nodes on their starter boards: a bolt pasted onto anything; the cover follows the bore', async () => {
    const boards = new Map(starterBoards()), byTitle = (re: RegExp) => [...boards].find(([t]) => re.test(t))!;
    const [, paste] = byTitle(/^Paste a bolt onto anything/), pb = paste(), pe = new Engine(pb); await pe.run();
    const po = (id: string) => pe.state.get(id)!.out as Record<string, unknown>;
    expect(Object.keys(pb.nodes).filter((id) => pe.state.get(id)!.status !== 'ok'), 'every node of the paste board runs').toEqual([]);
    for (const id of ['on plate', 'on boss']) { const cut = po(id).part as Part, pasted = po(id).pasted as Part;
      expect([cut.cuts?.length, cut.ports?.length, cut.imprints?.length, po(id).freedom, po(id).violation], `${id}: cut once, its hole an interface, recorded; the screw left only its turn`).toEqual([1, 1, 1, 1, '']);
      expect(pasted.parts!.map((p) => p.name), `${id}: the part and its screw`).toEqual([cut.name, 'M8 × 30 socket head cap screw']);
      expect(String(po(id).says), `${id}: seated on the counterbore's floor`).toContain('seated 8.5 mm down'); }
    // (the screw on the plate: its head's underside 8.5 mm below the top, its axis in the hole, pointing down into it)
    const sc = (po('on plate').pasted as Part).parts![1]!, q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...sc.rot!));
    expect(sc.at!.map((x) => +(x * 1000).toFixed(3) + 0), 'the screw stood where it was pasted, seated').toEqual([20, -3.5, 0]); expect(new THREE.Vector3(0, -1, 0).applyQuaternion(q).y, 'down into the plate').toBeCloseTo(-1, 9);
    expect([(po('on angle').part as Part).cuts ?? [], po('on angle').violation], 'the angle\'s 5 mm leg refused, nothing cut').toEqual([[], expect.stringMatching(/counterbore 8\.5 mm deep.*5\.0 mm plate/)]);
    expect([po('gained').holds, po('gained').violation], 'its assertion holds: the plate gained its hole as an interface').toEqual([true, '']);
    expect(pe.state.get('on angle')!.warnings?.join(' '), 'the refusal a warning on its node').toMatch(/refused/);
    // (pasted onto the angle's edge, its ray grazing its face: the hole's middle not within it, refused by its edge distance
    // (it was let through, an edge never met counted as endless wall: the AI found it, 2026-11-01))
    pb.nodes['on angle']!.set = { ...pb.nodes['on angle']!.set, x: 1, y: 0, z: 0.025, toward: '-x' }; pe.touch('on angle'); await pe.run();
    expect([(po('on angle').part as Part).cuts ?? [], po('on angle').violation], 'refused at the edge, nothing cut').toEqual([[], expect.stringMatching(/edge distance 0 mm/)]);
    const [, cover] = byTitle(/^The cover follows the bore/), cb = cover(), ce = new Engine(cb); await ce.run();
    const co = (id: string) => ce.state.get(id)!.out as Record<string, unknown>, holesAt = () => { const t = co('cover on flange').together as Part, cv = t.parts![1]!, qq = new THREE.Quaternion().setFromEuler(new THREE.Euler(...cv.rot!));
      return (cv.cuts ?? []).map((c) => new THREE.Vector3(...c.at).applyQuaternion(qq).add(new THREE.Vector3(...cv.at!))).map((v) => +(Math.hypot(v.x, v.z) * 1000).toFixed(2)); };
    expect(Object.keys(cb.nodes).filter((id) => ce.state.get(id)!.status !== 'ok'), 'every node of the cover board runs').toEqual([]);
    expect([co('cover on flange').freedom, co('cover on flange').violation, (co('cover on flange').table as unknown[]).length], 'the cover on the flange by its six holes and its face: 0 freedom left, all holding').toEqual([0, '', 7]);
    expect(holesAt(), 'the cover\'s holes over the 30.8 mm circle').toEqual(Array(6).fill(30.8));
    const bolts = co('bolts').bolts as Part; expect(bolts.parts!.map((x) => [+(Math.hypot(x.at![0], x.at![2]) * 1000).toFixed(2), +(x.at![1] * 1000).toFixed(2), x.parts!.map((y) => y.name).join(', ')]), 'six bolts drawn through both plates, each head\'s washer on the cover (its top 11 mm up)').toEqual(Array(6).fill([30.8, 12.6, 'M8 washer under the head, M8 × 30 hex bolt, M8 washer under the nut, M8 hex nut']));
    // (the flange is drawn about its middle, 10 mm thick: its top at 5 mm, the cover's at 11 mm, the head's washer on it)
    expect(+(((co('cover on flange').together as Part).parts![1]!.at![1]) * 1000).toFixed(3) + 0, 'the cover on the flange\'s top').toBe(8);
    cb.nodes.bore!.set = { ...cb.nodes.bore!.set, value: 0.05 }; ce.touch('bore'); await ce.run();
    expect([co('cover on flange').freedom, co('cover on flange').violation], 'widened: still on, still held').toEqual([0, '']); expect(holesAt(), 'its holes followed to the 35.8 mm circle').toEqual(Array(6).fill(35.8));
  }, 120_000);
  // (drag to imprint (spec 01, I16; design §2.9, decision 0016): the drop is found from what is drawn (the leaf a ray meets
  // and its matrix, walked up the board's wires to the first part that holds it there); the preview is the board's own paste
  // node run on that point, and only what it gives is drawn; accepting it is one node spliced into the wire toward the view;
  // an interface is copied by the node that made it. Every value here worked out by hand: 1.2 × 9.0 = 10.8, 7.5 + 7.5 = 15,
  // 2.2 × 9.0 = 19.8, √(50² + 30²) = 58.31, 50 − 30 = 20)
  it('drag to imprint (01.I16): the drop found by what is drawn; its preview the node\'s own run; accepted as one node spliced in; copied by its maker', async () => {
    const { hostOf, dropOn, planOf, previewInputs, pasteEdit, recordAt, makerOf, copyRecipe, verdictLines, boltSources } = await import('../../src/nexus/view/dock3d');
    const { flatten, leavesOf, isPart: isPartV } = await import('../../src/nexus/assembly');
    const { geometry: geo3 } = await import('../../src/nexus/view/kit3d');
    const { runBlock } = await import('../../src/nexus/dataflow');
    const boards = new Map(starterBoards()), byTitle = (re: RegExp) => [...boards].find(([t]) => re.test(t))!;
    const pb = byTitle(/^Paste a bolt onto anything/)[1](), pe = new Engine(pb); await pe.run();
    const po = (id: string) => pe.state.get(id)?.out as Record<string, unknown> | undefined, out = (id: string) => po(id)!;
    const flats = (a: unknown) => { const f: { leaf: Part; m: THREE.Matrix4 }[] = []; flatten(a as Part, (x) => { f.push({ leaf: x.leaf, m: x.m }); }); return f; };
    // (a) what the view draws reaches it by identity, down to the part pasted
    const all = out('all').assembly as Assembly, p1 = out('p1').placed as Assembly;
    expect([all.items[0]!.of === p1, p1.items[0]!.of === out('on plate').pasted], '(a) values reach the view by identity').toEqual([true, true]);
    // (b) the host: the plate's leaf, at its matrix in the view
    const W = flats(all), plateAt = W.find((f) => f.leaf.name === 'plate')!;
    const h1 = hostOf(pb, po, { key: 'show', leaf: plateAt.leaf, m: plateAt.m });
    if ('refused' in h1) throw new Error(h1.refused);
    expect([h1.node, h1.out, pb.edges[h1.edge]!.to, pb.edges[h1.edge]!.in], '(b) the plate\'s host: the paste on the plate, its wire into p1').toEqual(['on plate', 'pasted', 'p1', 'thing']);
    expect(h1.F.elements.every((x, i) => Math.abs(x - new THREE.Matrix4().elements[i]!) < 1e-12), '(b) placed where it is made').toBe(true);
    const astrayHit = hostOf(pb, po, { key: 'show', leaf: plateAt.leaf, m: plateAt.m.clone().premultiply(new THREE.Matrix4().makeTranslation(0.01, 0, 0)) });
    expect('refused' in astrayHit, '(b) the plate\'s leaf where it is not drawn: refused').toBe(true);
    // (the screw's head is one object in both pastes: the matrix decides which)
    const screwParts = new Set(((out('on boss').pasted as Part).parts![1]!.parts ?? []).flatMap((p) => leavesOf({ name: 'w', parts: [p] }).map((l) => l.part)));
    const widest = (p: Part) => Math.max(0, ...((p.shape as { lathe?: [number, number][] }).lathe ?? []).map((q) => q[0])), headR = Math.max(...[...screwParts].map(widest)), heads = W.filter((f) => screwParts.has(f.leaf) && widest(f.leaf) === headR);
    const onBoss = heads.find((f) => f.m.elements[12]! > 0.1)!, h2 = hostOf(pb, po, { key: 'show', leaf: onBoss.leaf, m: onBoss.m });
    expect(heads.filter((f) => f.leaf === onBoss.leaf).length, '(b) the same head drawn twice').toBeGreaterThanOrEqual(2);
    expect('refused' in h2 ? h2.refused : h2.node, '(b) the head on the boss is the boss\'s paste\'s').toBe('on boss');
    // (on the cover board: the flange's leaf, up to a part output that holds it, F·L = W)
    const cb = byTitle(/^The cover follows the bore/)[1](), ce = new Engine(cb); await ce.run();
    const co = (id: string) => ce.state.get(id)?.out as Record<string, unknown> | undefined, flange = flats(co('all')!.assembly).find((f) => f.leaf.name === 'flange')!;
    const h3 = hostOf(cb, co, { key: 'show', leaf: flange.leaf, m: flange.m }); if ('refused' in h3) throw new Error(h3.refused);
    const L = leavesOf(h3.value).find((l) => l.part === flange.leaf)!.m, FL = h3.F.clone().multiply(L);
    expect([isPartV(h3.value), FL.elements.every((x, i) => Math.abs(x - flange.m.elements[i]!) < 1e-9), flats(co(cb.edges[h3.edge]!.to)![Object.keys(co(cb.edges[h3.edge]!.to)!).find((k) => flats(co(cb.edges[h3.edge]!.to)![k]).some((f) => f.leaf === flange.leaf))!]).some((f) => f.leaf === flange.leaf)], '(b) the cover board\'s flange: a part output, F·L = W, its wire\'s target holding it').toEqual([true, true, true]);
    console.log(`I16 (b): the flange's host on the cover board is ${h3.node}.${h3.out}, by the wire into ${cb.edges[h3.edge]!.to}.${cb.edges[h3.edge]!.in}`);
    // (c) the drop: a ray onto the plate's top, and onto the boss's round side at 120° round from its first hole
    const ray = (from: V3, to: V3) => [new THREE.Vector3(...from), new THREE.Vector3(...to).sub(new THREE.Vector3(...from)).normalize()] as const;
    const d1 = dropOn(h1, ...ray([0.2, 0.3, 0.25], [-0.03, 0.005, -0.03]))!;
    expect([d1.at.map((x, i) => Math.abs(x - [-0.03, 0.005, -0.03][i]!) < 1e-9), d1.n.map((x) => +x.toFixed(9) + 0), d1.piece, d1.toward], '(c) on the plate\'s top').toEqual([[true, true, true], [0, 1, 0], 'plate', '-y']);
    expect(dropOn(h1, ...ray([0.2, 0.3, 0.25], [0.6, 0.6, 0.6])), '(c) a ray at nothing').toBeNull();
    const bossLeaf = W.find((f) => f.leaf.name === 'round boss')!, hb = hostOf(pb, po, { key: 'show', leaf: bossLeaf.leaf, m: bossLeaf.m }); if ('refused' in hb) throw new Error(hb.refused);
    const th = (120 * Math.PI) / 180, nb: V3 = [Math.cos(th), 0, Math.sin(th)], pw: V3 = [0.15 + 0.03 * nb[0], 0, 0.03 * nb[2]];
    const d2 = dropOn(hb, ...ray(pw.map((x, i) => x + 0.1 * nb[i]!) as V3, pw))!;
    expect([hb.node, d2.at.map((x, i) => Math.abs(x - [0.03 * nb[0], 0, 0.03 * nb[2]][i]!) < 1e-9), d2.n.map((x, i) => Math.abs(x - nb[i]!) < 1e-6), d2.toward], '(c) on the boss\'s side at 120°: (−15, 0, 25.98) mm in its frame, the normal radial').toEqual(['on boss', [true, true, true], [true, true, true], '-z']);
    // (d) the preview: the paste node's own run at the drop
    const [screwSrc] = boltSources(pb, po), plan = planOf(screwSrc!, h1, d1), t0 = performance.now(), pv = await runBlock('imprint', previewInputs(plan, po)), ms = performance.now() - t0;
    console.log(`I16 (d): one preview run took ${ms.toFixed(0)} ms (printed, not asserted)`);
    const im = pv.imprinted as { frame: { at: V3 }; cuts: Part['cuts'] & object[]; keep: { size: V3 }[]; contact: { r0: number; r: number; at: V3 }[]; refused: unknown };
    expect(im.frame.at.map((x, i) => Math.abs(x - d1.at[i]!) < 1e-9), '(d) its frame the drop').toEqual([true, true, true]);
    const rows = (pv.checks as { check: string; ok: boolean; need: number; have: number; source: string }[]).map((r) => [r.check, r.ok, r.need, r.have, ...(r.source ? [r.source] : [])]);
    expect(rows, '(d) its checks: the edge, breaking in and the spacing from the first hole, the key\'s room, the depth').toEqual([['edge distance', true, 10.8, 20, 'EN 1993-1-8'], ['breaking in', true, 15, 58.31, 'its own cuts'], ['spacing', true, 19.8, 58.31, 'EN 1993-1-8'], ['room', true, 24, 24, 'its keep'], ['depth', true, 10, 10, 'ISO 273']]);
    const mm3 = (x: number) => +(x * 1000).toFixed(3) + 0, cut0 = im.cuts[0] as { prof: [number, number][] };
    expect([im.cuts.length, cut0.prof.map(([r, d]) => [mm3(r), mm3(d)])], '(d) one turned remove: the counterbore 15 across, 8.5 deep, then the 9 mm hole through').toEqual([1, [[7.5, 0], [7.5, 8.5], [4.5, 8.5], [4.5, 10]]]);
    expect([im.keep.length, im.keep[0]!.size.map(mm3)], '(d) one keep: the hex key\'s reach, r 7.5 mm, 24 mm out').toEqual([1, [15, 24, 15]]);
    expect([im.contact.length, mm3(im.contact[0]!.r0), mm3(im.contact[0]!.r), mm3(im.contact[0]!.at[1])], '(d) one contact: 4.5 to 6.5 mm, 8.5 mm down from the top (5 mm)').toEqual([1, 4.5, 6.5, -3.5]);
    // (e) the card's words
    const v = verdictLines(pv, plan);
    expect([v.fits, v.head, v.lines.length, v.lines.every((l) => l.mark === '✓'), v.lines[0]!.text], '(e) fits, in five lines in the rule\'s words').toEqual([true, 'Fits: M8 × 30 socket head cap screw on the plate at (-30, 5, -30) mm', 5, true, 'edge distance 20 mm, e₂ ≥ 1.2 d₀ = 1.2 × 9.0 mm asks 10.8 mm (EN 1993-1-8)']);
    const astray = verdictLines(pv, { ...plan, drop: { ...plan.drop, at: [plan.drop.at[0] + 0.0002, plan.drop.at[1], plan.drop.at[2]] } });
    expect([astray.fits, astray.note], '(e) the node standing 0.2 mm from the drop: not cut from here').toEqual([false, expect.stringMatching(/0\.2 mm from the point/)]);
    // (f) a refusal 4 mm from the edge: what would be cut still drawn, nothing cut
    const near = planOf(screwSrc!, h1, { ...d1, at: [-0.046, 0.005, 0] }), pr = await runBlock('imprint', previewInputs(near, po)), ir = pr.imprinted as { refused: { rule: string; need: number; have: number; source: string }; cuts: unknown[] }, vr = verdictLines(pr, near);
    const platePiece = (p: Part) => piecesIn(p).find((x) => x.p.name === 'plate')!.p;
    expect([ir.refused.rule, ir.refused.need, ir.refused.have, ir.refused.source, ir.cuts.length, vr.fits, platePiece(pr.part as Part).cuts?.length], '(f) refused by its edge distance, the red still drawn, the plate as it was').toEqual(['edge distance', 10.8, 4, 'EN 1993-1-8', 1, false, 1]);
    expect(vr.head, '(f) said how short').toBe('Does not fit: edge distance, short by 6.8 mm — nothing will be cut');
    expect(vr.lines.map((l) => `${l.mark} ${l.text}`), '(f) its lines: the failing check crossed, the rest not measured').toEqual(['✕ edge distance 4 mm, e₂ ≥ 1.2 d₀ = 1.2 × 9.0 mm asks 10.8 mm (EN 1993-1-8)', '– breaking in: not measured (the first refusal stops the checks)', '– spacing: not measured (the first refusal stops the checks)', '– room: not measured (the first refusal stops the checks)']);
    // (g) the angle's 5 mm leg: stood on, its negative refused for the counterbore, no body to draw
    const ia = out('on angle').imprinted as { frame: unknown; tools: unknown[]; cuts: unknown[]; refused: { why: string } };
    expect([!!ia.frame, ia.tools, ia.cuts, ia.refused.why], '(g) the angle: its frame, nothing to cut, why').toEqual([true, [], [], expect.stringMatching(/counterbore/)]);
    // (h) accepted: one node spliced in, the board as it was beside it
    const b2 = structuredClone(pb), before = JSON.stringify(pb), id = pasteEdit(plan, b2)(b2);
    expect(JSON.stringify(pb), '(h) the board it was made from unchanged').toBe(before);
    const added = Object.keys(b2.nodes).filter((k) => !pb.nodes[k]), newEdges = Object.entries(b2.edges).filter(([k]) => !pb.edges[k]).map(([, e]) => [e.from, e.out, e.to, e.in]).sort(), changed = Object.keys(pb.edges).filter((k) => JSON.stringify(pb.edges[k]) !== JSON.stringify(b2.edges[k]));
    expect([added, b2.nodes[id]!.block, b2.nodes[id]!.set], '(h) one node: the paste node, set to the point').toEqual([[id], 'imprint', { toward: '-y', how: 'through', fit: 'medium', x: -0.03, y: 0.005, z: -0.03 }]);
    expect(newEdges, '(h) two wires: the screw and the part it goes on').toEqual([['on plate', 'pasted', id, 'part'], ['screw', 'part', id, 'it']].sort());
    expect([changed, b2.edges[h1.edge]], '(h) the wire toward the view, its id kept, now from the new node').toEqual([[h1.edge], { ...pb.edges[h1.edge], from: id, out: 'pasted' }]);
    const e2 = new Engine(b2); await e2.run(); const o2 = (k: string) => e2.state.get(k)!.out as Record<string, unknown>, cutPlate = platePiece(o2(id).part as Part);
    expect([Object.keys(b2.nodes).filter((k) => e2.state.get(k)!.status !== 'ok'), cutPlate.cuts?.length, cutPlate.ports?.length, cutPlate.imprints?.length], '(h) every node runs; the plate cut twice, two ports, two records').toEqual([[], 2, 2, 2]);
    expect([o2(id).checks, (o2(id).imprinted as { cuts: unknown }).cuts], '(h) the board\'s cut is the preview\'s').toEqual([pv.checks, im.cuts]);
    expect([o2('on plate').checks, o2('on plate').says], '(h) the paste on the plate unchanged').toEqual([out('on plate').checks, out('on plate').says]);
    const rec2 = cutPlate.imprints![1]!, o2f = (k: string) => e2.state.get(k)?.out as Record<string, unknown> | undefined;
    expect([Object.keys(b2.nodes).indexOf('p1') < Object.keys(b2.nodes).indexOf(id), makerOf(b2, o2f, rec2)], '(h) the new hole made by the new node, not by the place node before it that reads it').toEqual([true, id]);
    // (i) copy and paste: the first hole's record, its maker, the recipe; pasted on the boss's end face from the same screw
    const rec = recordAt(plateAt.leaf, [0.02 - 0.0074, 0.003, 0])!; // (on the counterbore's wall, 2 mm down: what a right-click on the hole meets)
    expect([recordAt(plateAt.leaf, [0.02 - 0.0085, 0.005, 0]), recordAt(plateAt.leaf, [-0.03, 0.005, -0.03])], '(i) beside the hole on the top, and far off: no record').toEqual([null, null]);
    expect([recordAt(plateAt.leaf, [0.02 - 0.003, 0.0075, 0]), recordAt(plateAt.leaf, [0.02 - 0.003, -0.0075, 0]), recordAt(plateAt.leaf, [0.02 - 0.003, -0.0055, 0]) === rec], '(i) over the hole 2.5 mm up, and 12.5 mm down past its 10 mm and the grace: none; at its foot: it').toEqual([null, null, true]);
    expect([rec === plateAt.leaf.imprints![0], makerOf(pb, po, rec)], '(i) the record under the point, made by the paste on the plate').toEqual([true, 'on plate']);
    const cr = copyRecipe(pb, po, 'on plate'); if ('refused' in cr) throw new Error(cr.refused);
    expect([cr.block, cr.wires, cr.set], '(i) its recipe: its own wire from the screw, its settings but where').toEqual(['imprint', [{ in: 'it', from: 'screw', out: 'part' }], { how: 'through', fit: 'medium' }]);
    const dTop = dropOn(hb, ...ray([0.15, 0.1, 0], [0.15, 0, 0]))!, b3 = structuredClone(pb), id3 = pasteEdit(planOf(cr, hb, dTop), b3)(b3);
    const its = Object.values(b3.edges).filter((e) => e.to === id3 && e.in === 'it' && !e.deleted).map((e) => [e.from, e.out]);
    expect([dTop.at.map((x) => mm3(x)), dTop.toward, its], '(i) pasted on the boss\'s end face: its it from the screw, one source (R15)').toEqual([[0, 20, 0], '-y', [['screw', 'part']]]);
    const e3 = new Engine(b3); await e3.run(); expect([e3.state.get(id3)!.status, (e3.state.get(id3)!.out as Record<string, unknown>).violation], '(i) and it runs and fits').toEqual(['ok', '']);
    // (j) what the strip offers: the paste board's one screw; on the cover board none (its bolts are made for the holes)
    expect([boltSources(pb, po).map((r) => [r.block, r.wires, r.name]), boltSources(cb, co)], '(j) the bolts the boards make').toEqual([[['imprint', [{ in: 'it', from: 'screw', out: 'part' }], 'M8 × 30 socket head cap screw']], []]);
    // (k) D16: an 80 mm boss drawn round to within 0.05 mm (worked out from its own vertices: the widest gap round its rim)
    const g = geo3({ cyl: [0.08, 0.006] }, undefined, undefined, undefined, true)!, P = g.getAttribute('position'), angs: number[] = [];
    for (let k = 0; k < P.count; k++) { const x = P.getX(k), z = P.getZ(k); if (Math.abs(Math.hypot(x, z) - 0.08) < 1e-6) angs.push(Math.atan2(z, x)); }
    const un = [...new Set(angs.map((a) => +a.toFixed(9)))].sort((a, b) => a - b), gap = Math.max(...un.map((a, k) => (k ? a - un[k - 1]! : a + 2 * Math.PI - un[un.length - 1]!))), sag = 0.08 * (1 - Math.cos(gap / 2));
    console.log(`I16 (k): the 80 mm boss's rim in ${un.length} facets, its sag ${(sag * 1000).toFixed(4)} mm`);
    expect(sag * 1000, '(k) its rim within 0.05 mm of round').toBeLessThanOrEqual(0.05 + 1e-9);
    // (as drawn; the checks read it with the 24 facets they had (fault D28: finer ones cost the engine board's checks five times
    // their time), pinned here so a change of it is made on purpose)
    const gc = geo3({ cyl: [0.08, 0.006] }, undefined)!, pc = gc.getAttribute('position'); let rim = 0; const seenA = new Set<string>(); for (let k = 0; k < pc.count; k++) if (Math.abs(Math.hypot(pc.getX(k), pc.getZ(k)) - 0.08) < 1e-6) seenA.add(Math.atan2(pc.getZ(k), pc.getX(k)).toFixed(9)); rim = seenA.size;
    expect(rim, '(k) the checks\' mesh: 24 facets round').toBe(24);
  }, 120_000);
  // (the AI builds by joints and leads with what fails (spec 01, I14; design §2.8), through its real tools, no model (C8):
  // a build whose assertion fails answers FAILS first; a change that breaks a check that held is not taken, the board left as
  // it was and the change kept as a shadow read can read; a change that keeps every check is taken; a plan's s may give an
  // unwired input its value)
  it('the AI\'s tools lead with what fails, and take a change only when what held still holds', async () => {
    const t = await toolsFor(emptyBoard('asked')), plan = { nodes: { m: { b: 'part.family', s: { family: 'stepper' } }, p: { b: 'part.family', s: { family: 'motorplate' } }, j: { b: 'joint' }, w: { b: 'measure' }, a: { b: 'assert', s: { what: 'their mass', how: 'at most', target: 0.1 } } }, wires: ['p.part>j.a', 'm.part>j.b', 'j.together>w.thing', 'w.mass>a.value'] };
    const built = await t.doTool('build', plan), lines = built.split('\n');
    expect(lines[0], 'the failing assertion first').toMatch(/^FAILS a: their mass is 0\.33\d+: FAILS \(at most 0\.1; off by/); expect(lines.slice(1).some((l) => /^FAILS/.test(l)), 'and no other check fails').toBe(false);
    expect(built, 'the motor on its plate by its four holes').toMatch(/j ok .*freedom=0/);
    // (the assertion mended: taken)
    const ok = await t.doTool('change', { set: { a: { target: 1 } } }); expect(ok, 'taken').not.toMatch(/NOT TAKEN|FAILS/); expect(t.board().nodes.a!.set!.target).toBe(1);
    // (a change that breaks the assertion that held: not taken, the board as it was, the change readable as a shadow)
    const before = JSON.stringify(t.board()), no = await t.doTool('change', { set: { a: { target: 0.1 } } });
    expect(no.split('\n').slice(0, 2), 'not taken, and why, then what fails').toEqual(['NOT TAKEN: it breaks what held (a); the board is as it was. The change is kept as a shadow (read it with shadow: true); change again to mend it.', expect.stringMatching(/^FAILS a: /)]);
    expect(JSON.stringify(t.board()), 'the board as it was').toBe(before);
    expect(await t.doTool('read', { node: 'a', out: 'holds', shadow: true }), 'the shadow read').toBe('false'); expect(await t.doTool('read', { node: 'a', out: 'holds' }), 'the board\'s own').toBe('true');
    // (and one that breaks the joint (the motor's port named wrong): the joint and all that rests on it named)
    const nj = await t.doTool('change', { set: { j: { pb: 'no such port' } } }); expect(nj.split('\n')[0], 'the joint broken').toMatch(/^NOT TAKEN: it breaks what held \(j, w, a\)/); expect(JSON.stringify(t.board())).toBe(before);
    // (a plan's s gives an unwired input its value: the screw pasted 20 mm from the plate's middle)
    // (at a point on the plate's top itself, as one would give it: pasted on the top, not on the face beyond (it was, twice))
    const p2 = await t.doTool('build', { nodes: { sc: { b: 'part.family', s: { family: 'screw', thread: 'M8', length: 30 } }, pl: { b: 'shape.box', s: { w: 0.1, h: 0.01, d: 0.1 } }, im: { b: 'imprint', s: { x: 0.02, y: 0.005, z: 0 } } }, wires: ['sc.part>im.it', 'pl.part>im.part'] });
    expect(p2, 'no setting refused, and the paste made').not.toMatch(/^!|FAILS/m); expect(p2).toMatch(/im ok .*freedom=1/); expect(await t.doTool('read', { node: 'im', out: 'says' }), 'on its top').toMatch(/stood on the box at \(20, 5, 0\) mm/);
    // (a ray that misses says where the part is, to aim again)
    await t.doTool('change', { set: { im: { x: 0.2 } } }); expect(await t.doTool('read', { node: 'im', out: 'violation', shadow: true }), 'where it is').toMatch(/meets nothing of it; it spans x -50…50, y -5…5, z -50…50 mm in its own frame/);
    // (a plan's nodes sent as text are read; as a list, refused in one line, not one a character (it sent 500: 2026-11-01))
    expect(await t.doTool('build', { nodes: JSON.stringify({ k: { b: 'in.number', s: { value: 2 } } }) }), 'as text: read').toMatch(/^k ok value=2/);
    expect((await t.doTool('build', { nodes: [{ b: 'in.number' }] })).split('\n').filter((l) => l.startsWith('!')), 'as a list: one refusal').toEqual(['! nodes: write them as an object, {"name": {"b": "block id", "s": {…}}}']);
    const guide = readFileSync(join(root, 'docs/FOR-AI.md'), 'utf8'); expect(guide, 'FOR-AI\'s rule: things built from the common pieces and the operations, never by a typed position, and the nodes that set places by number never used').toMatch(/never by a typed position[^]*`room\.over`[^]*`room\.through`[^]*Never use `place`[^]*`assert`/);
  }, 120_000);
  // (the three ways to build (decision 0025), through the AI's real tools and no model (C8): Assist's reply read by planOf
  // as the model writes it (prose, a fence, the JSON) and run by runPlan as the page runs it; what is wrong in a reply said,
  // never guessed; by hand, a piece joined by an operation the room offers, step on step; asked again, only what failed;
  // and the cards and the board's listing sent with the guide, short)
  it('the three ways to build: a plan read, run by the tools, joined by hand, asked again with only what failed', async () => {
    const { planOf, runPlan, joinPlan, failingOf, planAsk, boardBrief, piecesCard } = await import('../../src/nexus/agent');
    // (the fixed request, as a model would answer it: two plates stacked, four M5 bolts down the top one's holes)
    const reply = 'Here is the plan.\n```json\n{"tool": "build", "nodes": {"bot": {"b": "piece.plate", "s": {"name": "bottom plate", "w": 80, "t": 3, "d": 50, "holes": "-30,-15; 30,-15; -30,15; 30,15", "hole": 5.5}}, "top": {"b": "piece.plate", "s": {"name": "top plate", "w": 80, "t": 3, "d": 50, "holes": "-30,-15; 30,-15; -30,15; 30,15", "hole": 5.5}}, "st": {"b": "room.stack", "s": {"axis": "y"}}, "j0": {"b": "mate.bolted", "s": {"line": "top plate/holes", "which": 0, "size": "M5"}}, "j1": {"b": "mate.bolted", "s": {"line": "top plate/holes", "which": 1, "size": "M5"}}, "j2": {"b": "mate.bolted", "s": {"line": "top plate/holes", "which": 2, "size": "M5"}}, "j3": {"b": "mate.bolted", "s": {"line": "top plate/holes", "which": 3, "size": "M5"}}, "m": {"b": "measure"}}, "wires": ["bot.block>st.blocks", "top.block>st.blocks", "st.block>j0.held", "j0.block>j1.held", "j1.block>j2.held", "j2.block>j3.held", "j3.thing>m.thing"], "says": "Two 3 mm aluminium plates bolted with four M5 bolts {at the corners}"}\n```';
    const p = planOf(reply);
    expect([p.tool, Object.keys(p.input.nodes!).length, p.input.wires!.length, p.says], 'read whole, a brace in its words minded').toEqual(['build', 8, 7, 'Two 3 mm aluminium plates bolted with four M5 bolts {at the corners}']);
    const ran = await runPlan(p, emptyBoard('asked'));
    expect(ran.failing, 'run by the tools: nothing refused, nothing failing').toEqual([]);
    const e = new Engine(ran.board); await e.run();
    const pieces = e.state.get('j3')?.out?.pieces as number; console.log(`Assist's plan for the fixed request, run: ${nodesOf(ran.board).length} nodes, ${pieces} pieces, ${String(e.state.get('m')?.out?.mass)} kg`);
    expect(pieces, 'two plates and four joints, each a shank, a head, a washer and a nut').toBe(2 + 4 * 4);
    // (what a reply gets wrong, said back, never guessed at)
    expect(() => planOf('I would use two plates.'), 'no JSON').toThrow(/no plan in the reply: it holds no JSON/);
    expect(() => planOf('{"tool": "build", "nodes": {"a": {"b": "piece.bolt"}'), 'cut short').toThrow(/not closed/);
    expect(() => planOf('{"tool": "build", "nodes": [{"b": "piece.bolt"}]}'), 'nodes as a list').toThrow(/write them as an object/);
    expect(() => planOf('{"tool": "build", "nodes": {"a b": {"b": "piece.bolt"}}}'), 'a name a wire cannot read').toThrow(/letters, digits and _/);
    expect(() => planOf('{"tool": "change"}'), 'a change of nothing').toThrow(/changes nothing/);
    expect(planOf('{"add": {"n": {"b": "piece.nut"}}, "wires": []}').tool, 'no tool named: a change, from its add').toBe('change');
    // (a plan whose block does not exist runs, refused by the tools, and only those lines are asked again)
    const bad = await runPlan(planOf('{"tool": "change", "add": {"x": {"b": "piece.nosuch"}}, "set": {"top": {"nosetting": 1}}}'), ran.board);
    expect(bad.failing.map((l) => l.slice(0, 40)), 'the refusals').toEqual(['! top: no setting or input nosetting (it', '! x: no block "piece.nosuch"']);
    const again = planAsk('Two plates bolted', bad.board, bad.failing);
    expect(again, 'asked again: the board listed, then only what failed').toMatch(/^The board open \(8 nodes; change it by these names\):\nbot: piece\.plate [^]*\nAsked: Two plates bolted\nWhen the plan ran, these failed \(mend only them, with a change\):\n! top: no setting or input nosetting[^\n]*\n! x: no block "piece\.nosuch"$/);
    expect(failingOf('a ok\nFAILS a: no\nNOT TAKEN: it breaks\nb failed: x\nc ok'), 'every kind of failing line').toEqual(['FAILS a: no', 'NOT TAKEN: it breaks', 'b failed: x']);
    // (by hand: a plate alone, then a bolt down its first hole, then a nut over the bolt's shank, each a step on the last)
    const h1 = await runPlan(joinPlan(emptyBoard('hand'), { b: 'piece.plate', s: { name: 'plate' } }), emptyBoard('hand'));
    const e1 = new Engine(h1.board); await e1.run(); expect(e1.state.get('plate1')?.out?.offers, 'the plate offers its holes').toContain('plate/holes');
    const h2p = joinPlan(h1.board, { b: 'piece.bolt', s: { size: 'M8', length: 20 } }, { op: 'room.through', s: { line: 'plate/holes', which: 0 }, host: 'plate1' });
    expect(h2p.input, 'the piece and the operation, and their wires').toEqual({ add: { bolt1: { b: 'piece.bolt', s: { size: 'M8', length: 20 } }, through1: { b: 'room.through', s: { line: 'plate/holes', which: 0 } } }, wires: ['plate1.block>through1.host', 'bolt1.block>through1.passer'] });
    const h2 = await runPlan(h2p, h1.board); expect(h2.failing, 'the bolt through the hole').toEqual([]);
    const e2 = new Engine(h2.board); await e2.run(); const shank = (e2.state.get('through1')?.out?.offers as string[]).find((o) => /shank\/axis$/.test(o));
    expect(shank, 'the bolt offers its shank').toBeTruthy();
    // (the operation's own default fit, a slide, has no room for a nut's bore of the thread's size: refused with both
    // sizes, said back to the person; a touch, as the bolted joint slides its nut, fits)
    const slid = await runPlan(joinPlan(h2.board, { b: 'piece.nut', s: { size: 'M8' } }, { op: 'room.over', s: { line: shank, where: 'lo' }, host: 'through1' }), h2.board);
    expect(slid.failing, 'refused with both sizes').toEqual([`over1 failed: no room over ${shank}: the M8 nut's bore is 8.00 mm across; it needs 8.50 mm`]);
    const h3 = await runPlan(joinPlan(h2.board, { b: 'piece.nut', s: { size: 'M8' } }, { op: 'room.over', s: { line: shank, where: 'hi', fit: 'touch' }, host: 'through1' }), h2.board);
    expect(h3.failing, 'the nut over the shank').toEqual([]);
    const e3 = new Engine(h3.board); await e3.run(); expect(e3.state.get('over1')?.out?.pieces, 'the plate, the bolt\'s shank and head, the nut').toBe(4);
    const h4 = await runPlan(joinPlan(h3.board, { b: 'piece.washer' }, { op: 'room.stack', s: { axis: 'x' }, host: 'over1' }), h3.board);
    expect([h4.failing, edgesOf(h4.board).filter((w) => w.to === 'stack1').map((w) => w.from)], 'stacked beside: the host first, then the piece').toEqual([[], ['over1', 'washer1']]);
    // (the board as the model is told it, and the cards sent with the guide: short, and every piece in them)
    expect(boardBrief(h2.board), 'a line a node, settings not the default, the wires').toBe('The board open (3 nodes; change it by these names):\nplate1: piece.plate\nbolt1: piece.bolt {"length":20}\nthrough1: room.through {"line":"plate/holes"}\nwires: plate1.block>through1.host bolt1.block>through1.passer');
    const cards = piecesCard(); for (const id of [...LIBRARY.keys()].filter((k) => /^(piece|room)\./.test(k))) expect(cards, `the cards hold ${id}`).toMatch(new RegExp(`^${id.replace('.', '\\.')}\\b`, 'm'));
    console.log(`the cards sent with the guide: ${cards.length} characters; the guide ${readFileSync(join(root, 'docs/FOR-AI.md'), 'utf8').length}`);
    expect(cards.length, 'the cards, short').toBeLessThan(6000);
  }, 120_000);
  // (ISO 286 classes as limits (spec 01, I17): H, h and JS from the IT grade alone, other letters from ISO 286-2's
  // fundamental deviations; each of the evaluation set's waiting cases' limits as the app now works them out, offset and
  // width (a width alone let a wrong offset through: I15's evaluator); and the fit two make)
  it('ISO 286 limits from the tables held, and fits judged from both: the evaluation set\'s bearing, dowel and key', () => {
    const set = JSON.parse(readFileSync(join(root, 'evals/interfaces/cases.json'), 'utf8')) as { cases: { case: number; expect: Record<string, unknown> }[] }, e = (n: number) => set.cases.find((c) => c.case === n)!.expect;
    const lim = (size: number, cls: string, table = DEVIATION) => { const l = limitsOf(cls, size, table); if ('refused' in l) throw new Error(l.why); return [l.loUm, l.hiUm]; };
    expect([lim(25, 'k5'), lim(52, 'H7')], 'case 6: the shaft k5, the housing H7').toEqual([e(6).shaft_um, e(6).housing_um]);
    expect([lim(6, 'm6'), lim(6, 'H7'), lim(6, 'G7')], 'case 11: the pin m6 (over 3 to 6, not 6 to 10\'s +6 to +15), its hole H7, the sliding side G7').toEqual([e(11).pin_um, e(11).hole_um, e(11).sliding_um]);
    expect([lim(8, 'N9'), lim(8, 'JS9')], 'case 12: the keyways, N9 in the shaft, JS9 in the hub').toEqual([e(12).shaft_um, e(12).hub_um]);
    const f = (a: [string, number], b: [string, number]) => fitOf(limitsOf(...a) as { loUm: number; hiUm: number }, limitsOf(...b) as { loUm: number; hiUm: number });
    expect([f(['H7', 6], ['m6', 6]), f(['G7', 6], ['m6', 6])].map((x) => [x.kind, x.mostClearUm, x.mostTightUm]), 'a 6 m6 pin in H7, in G7: transitions, so far clear, so far tight').toEqual([['transition', 8, 12], ['transition', 12, 8]]);
    expect(f(['H7', 52], ['k5', 25]).kind === undefined, 'two sizes: not compared here').toBe(false);
    for (const [cls, size, why] of [['k5', 40, /IT5 over 30 to 50 mm: its Table 1 row is not held/], ['k6', 25, /no ISO 286-2 row for k over 18 to 30 mm at IT6/], ['m6', 8, /no ISO 286-2 row for m over 6 to 10/], ['H9', 12, /IT9 over 10 to 18 mm: its Table 1 row is not held/], ['JS5', 25, /IT5 is 9 µm, odd/]] as [string, number, RegExp][])
      expect((limitsOf(cls, size) as Refusal).why, `${cls} at ${size} mm: refused, never guessed`).toMatch(why);
    // (a deviation table with k's lower deviation 3 breaks case 6's shaft: the offset is held, not only the width)
    expect(lim(25, 'k5', DEVIATION.map((d) => (d.cls === 'k' ? { ...d, lower: 3 } : d))), 'a k row planted wrong').not.toEqual(e(6).shaft_um);
  });
  // (turned blocks, bends and runs (decision 0024): a rigid turn keeps a block valid, so at any angle about any axis no
  // point is inside two of its pieces, each piece's points lie in its bound and the block's bound holds them (points sampled
  // in and round each piece's bound); a coupling along a turned pipe's line and a pin through a turned plate's hole keep
  // apart the same way; a run's segments meet end to end, each one's end at the next one's start, read from the solids
  // alone; a bend radius not above the pipe's, and a path that runs into itself, are refused; the starter board runs)
  it('the red team\'s ways past the turn are closed: a turn about no axis, a case\'s cut keeping its wall, a post into a cup over which a rod runs, the drawn turn near a quarter about y', () => {
    // (2026-11-05: each wrote an overlap or drew a piece off its solid; each is now refused or exact)
    const two = roomStack('two', 1, [{ b: cpPlate('a', 0.1, 0.01, 0.1, 'steel-low') }, { b: cpPlate('b', 0.1, 0.01, 0.1, 'steel-low') }]);
    expect(() => roomTurn(two, -1 as 0, 60), 'an axis that is not x, y or z').toThrow(/x, y or z/);
    expect(() => roomTurn(two, 3 as 0, 90)).toThrow(/x, y or z/);
    // (a case passed through a plate on a clear fit: the plate is cut all round it, the gap kept, nothing inside its wall)
    const b = roomThrough(cpPlate('pl', 0.2, 0.01, 0.2, 'steel-low', [[0, 0]]), roomMade('box case', 'abs', { case: [0.05, 0.05, 0.05, 0.005, 0.005] }), { port: 'pl/holes', from: 'lo' }, 'clear');
    const c = b.pieces[1]!.solid.base.c, y = b.pieces[0]!.solid.base.c[1];
    expect(b.pieces.filter((p) => insideOf(p, c[0] + 0.0205, y + 0.002, c[2])).map((p) => p.name), 'inside the case\'s wall: the case only').toEqual(['box case']);
    expect(b.pieces.filter((p) => insideOf(p, c[0] + 0.0254, y + 0.002, c[2])).map((p) => p.name), 'in the gap: neither').toEqual([]);
    // (a rod through a plate on edge, running over an open cup: a tall post into the cup is refused by name)
    const host = roomStack('h', 0, [{ b: cpRoundCase('cup', 0.02, 0.02, 0.002, 0.002, 'abs') }, { b: roomTurn(cpPlate('pl', 0.1, 0.01, 0.03, 'steel-low', [[0.04, 0]], 0.004), 2, 90) }]);
    const rod = roomThrough(host, roomMade('rod', 'steel-low', { cyl: [0.003, 0.08] }), { port: 'pl/holes', from: 'lo' }, 'slide');
    expect(() => roomInto(rod, 'cup/cavity', roomMade('post', 'steel-low', { cyl: [0.01, 0.1] })), 'the post would meet the rod').toThrow(/meet the rod/);
    expect(roomInto(rod, 'cup/cavity', roomMade('short post', 'steel-low', { cyl: [0.01, 0.015] })).pieces.length, 'a post under the rod goes in').toBe(rod.pieces.length + 1);
    // (the drawn turn matches the solid's frame near a quarter turn about y, where the old angles were off by 3e-4)
    const tilted = roomTurn(roomTurn(roomMade('rod', 'steel-low', { cyl: [0.01, 1] }), 2, 70), 1, -89.98), part = partOfBlock(tilted).parts![0]!, f = tilted.pieces[0]!.solid.base.frame!;
    const o = new THREE.Object3D(); o.rotation.set(...(part.rot as [number, number, number])); o.updateMatrix(); const e = o.matrix.elements;
    const drawn = [e[0], e[4], e[8], e[1], e[5], e[9], e[2], e[6], e[10]];
    expect(Math.max(...drawn.map((x, i) => Math.abs(x! - f[i]!))), 'drawn as its frame').toBeLessThan(1e-12);
  });
  it('a turned block keeps every pair of its pieces apart at every angle; a run\'s segments meet end to end', async () => {
    const sample = (b: RoomBlock, n: number) => { let shared = 0, outOwn = 0, outBlock = 0, inside = 0;
      for (const p of b.pieces) { const [lo, hi] = roomBound(p), g = [0, 1, 2].map((k) => (hi[k]! - lo[k]!) * 0.15);
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
          const q = [i, j, k].map((t, a) => lo[a]! - g[a]! + ((t + 0.5) / n) * (hi[a]! - lo[a]! + 2 * g[a]!)) as [number, number, number];
          if (!insideOf(p, ...q)) continue; inside++;
          if (q.some((v, a) => v < lo[a]! || v > hi[a]!)) outOwn++; if (q.some((v, a) => v < b.lo[a]! || v > b.hi[a]!)) outBlock++;
          if (b.pieces.filter((r) => insideOf(r, ...q)).length > 1) shared++; } }
      return { shared, outOwn, outBlock, inside: inside > 0 }; };
    const plates = roomStack('two plates', 1, [{ b: cpPlate('bottom plate', 0.08, 0.005, 0.05, 'steel-low', [[-0.025, 0], [0.025, 0]], 0.009) }, { b: cpPlate('top plate', 0.08, 0.005, 0.05, 'al-6061', [[-0.025, 0], [0.025, 0]], 0.009) }]);
    const joint = cpBolted(plates, 'top plate/holes', 'M8'), run = pipeRun('copper 15×0.7', [{ straight: 0.06 }, { bend: 90 }, { straight: 0.05 }, { elbow: 90, toward: 90 }, { straight: 0.04 }, { bend: 45, toward: 180 }, { straight: 0.03 }]);
    // (a tee: its branch joined into its run's side (Branch, decision 0024): the run's wall opened on the branch's axis and
    // whole across from it, the branch's end cut to the run's outside; nothing shared at any angle, as for the rest)
    const tee = cpTee('copper 22×0.9'), body = tee.pieces.find((p) => p.name === 'copper 22×0.9 tee body')!, B = body.solid.base as unknown as { c: [number, number, number]; r: number; ri: number }, wall = (B.r + B.ri) / 2;
    expect([insideOf(body, B.c[0] + wall, B.c[1], B.c[2]), insideOf(body, B.c[0] - wall, B.c[1], B.c[2]), tee.pieces.filter((p) => insideOf(p, B.c[0] + B.r + 0.0005, B.c[1], B.c[2])).map((p) => p.name)], 'the run\'s wall opened toward the branch only; past its outside, the branch\'s bore').toEqual([false, true, []]);
    expect(() => roomBranch(tee, 'copper 22×0.9 tee socket 1/axis', roomRun('stub', [{ name: 'stub', mat: 'copper', ro: 0.012, ri: 0.01, straight: 0.03 }])), 'a branch as wide as half its straight').toThrow(/would reach past its ends/);
    for (const [what, b] of [['a bolted joint', joint], ['a pipe run with an elbow', run], ['a bar of a section', cpSection('steel angle 50×50×5 (EN 10056)', 0.08)], ['a copper tee', tee]] as const)
      for (const axis of [0, 1, 2] as const) for (const deg of [0, 17, 30, 90, 123, 200]) expect(sample(roomTurn(b, axis, deg), 9), `${what} turned ${deg}° about ${'xyz'[axis]}`).toEqual({ shared: 0, outOwn: 0, outBlock: 0, inside: true });
    // (along a turned line: a coupling over a pipe laid across, a pin through a tilted plate's hole)
    const across = roomTurn(cpPipe('copper 15×0.7', 0.2), 2, 90), coupled = roomOver(across, 'copper 15×0.7 pipe/axis', cpCoupling('copper 15×0.7'), 'hi');
    expect([coupled.pieces.length, coupled.faces.length, roomBound(coupled.pieces[1]!).map((v) => +(v[0] * 1000).toFixed(2))], 'the coupling over the pipe\'s end, along x').toEqual([2, 1, [-100, -60]]);
    const pinned = roomThrough(roomTurn(cpPlate('plate', 0.1, 0.008, 0.06, 'steel-low', [[0, 0]], 0.009), 0, 30), roomMade('pin', 'steel-alloy', { cyl: [0.004, 0.03] }), { port: 'plate/holes', from: 'lo' }, 'slide');
    for (const [what, b] of [['the coupling on the turned pipe', coupled], ['the pin through the tilted plate', pinned]] as const) expect(sample(b, 14), what).toEqual({ shared: 0, outOwn: 0, outBlock: 0, inside: true });
    // (the pipe laid across, stacked on a plate: it touches the plate along a line, its whole length, and that face is written)
    const laid = roomStack('a pipe on a plate', 1, [{ b: cpPlate('base', 0.25, 0.005, 0.05, 'steel-low') }, { b: across }]);
    expect(laid.faces.map((f) => [f.patch, +((f.length ?? 0) * 1000).toFixed(1)]), 'a line face along the pipe').toEqual([['line', 200]]);
    // (its segments end to end: each one's end at the next one's start, heading the same way)
    const line = run.pieces.filter((p) => !/socket/.test(p.name)); expect(line.length, 'the pipe and the elbow\'s body: seven segments').toBe(7);
    for (let i = 0; i + 1 < line.length; i++) { const a = endsOf(line[i]!.solid.base), b = endsOf(line[i + 1]!.solid.base);
      expect(Math.hypot(a.end[0] - b.start[0], a.end[1] - b.start[1], a.end[2] - b.start[2]), `${line[i]!.name}'s end at ${line[i + 1]!.name}'s start`).toBeLessThan(1e-9);
      expect(a.endDir[0] * b.startDir[0] + a.endDir[1] * b.startDir[1] + a.endDir[2] * b.startDir[2], 'heading the same way').toBeGreaterThan(1 - 1e-9); }
    expect(() => pipeRun('copper 15×0.7', [{ straight: 0.05 }, { bend: 90, R: 0.007 }]), 'a bend radius not above the pipe\'s').toThrow(/not above its tube's outside radius/);
    expect(() => pipeRun('copper 15×0.7', [0, 1, 2, 3, 4].flatMap(() => [{ straight: 0.03 }, { bend: 90, R: 0.02 }])), 'a path round a square and on over its start').toThrow(/runs into itself/);
    const [, make] = starterBoards().find(([t]) => t.startsWith('Pipes that turn'))!, board = make(), e = new Engine(board, env); await e.run();
    expect([...e.state].filter(([, s]) => s.status === 'failed').map(([id, s]) => `${id}: ${s.error}`), 'the starter board runs').toEqual([]);
  });
  // (the negative as rows (spec 01, I17): one general path reads every kind of seat from data. The code that makes,
  // measures and cuts a negative names no kind of seat and tests no row by name; a row given at run time is answered by it;
  // every expression of a row comes to a number, its units ones the lexer reads as lengths or angles; what rows read is
  // sourced)
  it('the negative is rows: the engine names no kind; a row given at run time is answered', () => {
    const KIND = /bearing|keyway|dowel|pipe|cut-?out|push ?button|6205|8x7|D22|SKF|DIN 6885|ISO 1179|ISO 228|IEC 60947|\.row\s*===/i;
    // (a top-level declaration's text, to the next line at the left margin, its comments taken out)
    const bodyOf = (file: string, name: string) => { const text = readFileSync(join(root, 'src/nexus', file), 'utf8'), m = new RegExp(`^(export )?(async )?(function|const) ${name}\\b`, 'm').exec(text);
      if (!m) throw new Error(`${file}: no ${name}`); const rest = text.slice(m.index), end = rest.slice(1).search(/\n(?=[^\s}\])])/); return (end < 0 ? rest : rest.slice(0, end + 1)).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1'); };
    const general: [string, string][] = [['brep.ts', 'solidsOf'], ['view/kit3d.ts', 'drill'], ['mass.ts', 'massOf']];
    for (const [f, nm] of general) { const b = bodyOf(f, nm); expect(b.length, `${f} ${nm}: read whole`).toBeGreaterThan(40); expect(b.match(KIND)?.[0], `${f} ${nm} names a kind of seat or tests a row by name`).toBeUndefined(); }
    // (and every declaration of the three files that make, measure and cut a negative, outside the rows block: a row tested
    // by a pattern in a function not named on a list passed (the evaluator, 2026-11-02). Not the sources' titles (data
    // about where tables were read) nor the type that lists the mirror kinds (a type, no path))
    const decls = (f: string) => { let t = readFileSync(join(root, 'src/nexus', f), 'utf8'); const a = t.indexOf('// ---- rows (data)'), b = t.indexOf('// ---- end of rows'); if (a > 0) t = t.slice(0, a) + t.slice(b);
      t = t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1'); const ms = [...t.matchAll(/^(export )?(async )?(function|const|type|interface) (\w+)/gm)];
      return ms.map((m, i) => ({ f, name: m[4]!, kind: m[3]!, body: t.slice(m.index!, i + 1 < ms.length ? ms[i + 1]!.index : t.length) })); };
    const all = ['interfaces.ts', 'mate.ts', 'form.ts'].flatMap(decls), code = all.filter((d) => d.kind === 'function' || d.kind === 'const').filter((d) => d.name !== 'TABLE_SOURCES');
    expect(['negativeOfRow', 'keyedRow', 'bandedRow', 'limitsOf', 'fitOf', 'imprint', 'MEASURE', 'applyImprint', 'reapplyImprints', 'standOn', 'portOfInterface', 'roundedRect', 'notchedCircle'].filter((n) => !code.some((d) => d.name === n)), 'the general code all read').toEqual([]);
    for (const d of code) expect(d.body.match(KIND)?.[0], `${d.f} ${d.name} names a kind of seat or tests a row by name`).toBeUndefined();
    const planted = decls('mate.ts').find((d) => d.name === 'reapplyImprints')!.body.replace('const kept: string[] = []', 'const kept: string[] = [], hot = host.imprints?.some((r) => /bearing/.test(r.of))');
    expect(planted.match(KIND)?.[0], 'a row tested by a pattern in reapplyImprints, planted').toBe('bearing');
    expect(`function pick(a) {\n  if (a.row === 'bearing seat') return 1;\n}`.match(KIND), 'a row tested by its name, planted').not.toBeNull();
    // (no source file asks for a row by its key outside the rows block: as a row asked, an index, a test or a case (a
    // family's display name that reads the same is not a reference to the row). The starter boards are data, as the
    // evaluation cases are: a board asks a standard by its name)
    const src = (d: string): string[] => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? src(join(d, e.name)) : /\.ts$/.test(e.name) ? [join(d, e.name)] : []));
    const texts = src('src').filter((f) => !f.endsWith('nexus/starters.ts')).map((f) => { let t = readFileSync(join(root, f), 'utf8'); if (f.endsWith('nexus/interfaces.ts')) { const a = t.indexOf('// ---- rows (data)'), b = t.indexOf('// ---- end of rows'); expect(a > 0 && b > a, 'the rows block marked').toBe(true); t = t.slice(0, a) + t.slice(b); } return [f, t] as const; });
    const asks = (k: string) => new RegExp(`(\\brow\\s*:\\s*|\\[\\s*|[!=]==?\\s*|\\bcase\\s+)['"\`]${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`);
    const named = (keys: string[]) => texts.flatMap(([f, t]) => keys.filter((k) => asks(k).test(t)).map((k) => `${f}: ${k}`));
    expect(['if (a.row === \'parallel key\') x();', "imprint(h, { row: 'pipe port', size }, a, b)", "NEGATIVE_ROWS['bearing seat']", "name: 'parallel key', path: []"].map((t) => ['parallel key', 'pipe port', 'bearing seat'].some((k) => asks(k).test(t))), 'asked by name, planted three ways; a display name is not').toEqual([true, true, true, false]);
    expect(named(Object.keys(NEGATIVE_ROWS)), 'a row named outside the rows').toEqual([]);
    expect(named(['thread.external']).length, 'a name the code does test is found (the scan sees)').toBeGreaterThan(0);
    // (a row given at run time, over the CLEARANCE table rows read: exactly I5's M8 medium hole, 9 mm through 10 mm)
    const row: NegativeRow = { of: { kind: 'hole.clearance', says: 'a clearance hole, written as a row (a test row)' }, asks: ['thread'], lookups: [{ table: 'CLEARANCE', key: '{thread}' }],
      sides: { plate: { frame: 'surface', tools: [{ role: 'remove', turned: [['medium / 2', '0'], ['medium / 2', 't']], why: 'ISO 273 medium clearance for {thread}: {medium} mm' }],
        checks: [{ check: 'edge distance', measure: 'across', need: '1.2 * medium', from: 'axis', rule: 'e₂ ≥ 1.2 d₀', source: 'EN 1993-1-8' }, { check: 'breaking in', measure: 'breaking in', rule: 'the hole clear of the piece\'s other holes', source: 'its own cuts' },
          { check: 'spacing', measure: 'spacing', need: '2.2 * medium', rule: 'p₁ ≥ 2.2 d₀', source: 'EN 1993-1-8' }],
        mirror: { kind: 'hole.clearance', sex: 'holes', takes: '{thread}', size: { d: 'medium' }, std: 'ISO 273', fit: 'ISO 273 medium', joint: 'fixed' } } }, side: 'plate', sources: ['ISO 273'] };
    const host = { material: 'steel-low', thickness: 0.01 }, i5 = negativeOf({ kind: 'thread.external', thread: 'M8', through: true }, host, { fit: 'medium' }) as Negative, byRow = negativeOf({ row: 'clear', size: { thread: 'M8' } }, host, { rows: { clear: row } }) as Negative;
    expect(byRow.tools.map((x) => [x.role, x.prof, x.why]), 'the row\'s hole is I5\'s').toEqual(i5.tools.map((x) => [x.role, x.prof, x.why]));
    expect([byRow.mirror.takes, byRow.mirror.size.d, byRow.checks.map((c) => [c.check, c.need === undefined ? c.need : +Number(c.need).toFixed(9)])], 'its mirror and checks').toEqual(['M8', i5.mirror.size.d, i5.checks.filter((c) => c.check !== 'room').map((c) => [c.check, c.need === undefined ? c.need : +Number(c.need).toFixed(9)])]);
    expect([frameOfAsking({ row: 'clear', size: {} }, { clear: row }), frameOfAsking({ kind: 'face', nema: '23' })]).toEqual(['surface', 'surface']);
    // (what it cannot read, refused: no such row, no such side, no table row for the size, an expression that does not come out)
    const why = (a: Asking, rows = { clear: row }) => (negativeOf(a, host, { rows }) as Refusal).why;
    expect([why({ row: 'none', size: {} }), why({ row: 'clear', side: 'hub', size: { thread: 'M8' } }), why({ row: 'clear', size: { thread: 'M7' } }),
      why({ row: 'clear', size: { thread: 'M8' } }, { clear: { ...row, sides: { plate: { ...row.sides.plate!, tools: [{ role: 'remove', turned: [['nothing / 2', '0']], why: '' }] } } } })])
      .toEqual([expect.stringMatching(/no row "none"/), expect.stringMatching(/no side "hub" \(it has plate\)/), expect.stringMatching(/no CLEARANCE row for M7/), expect.stringMatching(/^clear: /)]);
    // (a section cut by a row, imprinted: whole within the piece where every point of its outline is (a slot along a round
    // shaft passes, though a ray across its middle leaves the shaft's side first; one run off a plate's end is refused),
    // a zone held only where its surface is made, and a fit not judged said so)
    const slotRow: NegativeRow = { of: { kind: 'slot', says: 'a slot milled a depth (a test row)' }, asks: ['L', 'b'], lookups: [], unjudged: 'the asker\'s own limits are not held (a test row)',
      sides: { face: { frame: 'surface', tools: [{ role: 'remove', outline: { rect: ['L', 'b'], r: 'b/2' }, depth: '4 mm', why: 'a slot {L} × {b} mm, 4 mm deep (derived)' }],
        zones: [{ on: 'b', basic: 'b', lo: '0', hi: '0.1 mm', src: 'derived' }, { on: 'floor', basic: '4 mm', hi: '0', when: 't > 50 mm', src: 'derived' }],
        checks: [{ check: 'edge distance', measure: 'across', at: '2 mm', need: '0', from: 'outline', rule: 'the slot within the piece', source: 'derived' }, { check: 'spacing', measure: 'spacing', need: ['30 mm', '50 mm'], rule: '30 mm along, or 50 across', source: 'derived' }],
        mirror: { kind: 'keyway', sex: 'holes', takes: 'slot {b}', size: { b: 'b' }, std: 'derived', t: '4 mm', joint: 'slider' } } }, side: 'face', sources: ['derived'] };
    const slotted = (host: Part, from: V3, dir: V3) => imprint(host, { row: 'slot', size: { L: 0.04, b: 0.008 } }, from, dir, { rows: { slot: slotRow } });
    const shaft: Part = { name: 'shaft', parts: [{ name: 'bar', shape: { cyl: [0.015, 0.08] }, at: [0, 0, 0], mat: 'steel-low' }] }, plate: Part = { name: 'plate', parts: [{ name: 'plate', shape: { box: [0.1, 0.01, 0.03] }, at: [0, 0, 0], mat: 'steel-low' }] };
    const onShaft = slotted(shaft, [0.05, 0, 0], [-1, 0, 0]) as Imprinted, edge = onShaft.checks.find((c) => c.check === 'edge distance')!;
    expect([onShaft.frame.u.map((x) => +x.toFixed(9)), edge.ok, edge.have > 0], 'along the shaft\'s axis, whole within it').toEqual([[0, 1, 0], true, true]);
    // (the old measure, reach against the ray along each direction: the ray at 30° from the axis leaves the side 15 mm out,
    // and the slot reaches 17.9 mm that way, so it refused a slot that is whole)
    expect(+(Math.sqrt(0.015 ** 2 - 0.013 ** 2) / Math.sin(Math.PI / 6) * 1000).toFixed(1) < +((0.016 * Math.cos(Math.PI / 6) + 0.004) * 1000).toFixed(1), 'the old measure refused it').toBe(true);
    const offEnd = slotted(plate, [0.035, 0.05, 0], [0, -1, 0]) as Refusal; expect([offEnd.rule, offEnd.need, offEnd.have], 'run off the plate\'s end by 5 mm').toEqual(['edge distance', 0, -5]);
    const onPlate = slotted(plate, [0, 0.05, 0], [0, -1, 0]) as Imprinted;
    expect([onPlate.negative.limits!.map((l) => l.on), onPlate.negative.why.at(-1)], 'the floor\'s zone not held in a 10 mm plate; the fit not judged, said').toEqual([['b'], 'the fit not judged: the asker\'s own limits are not held (a test row)']);
    const cutPlate = applyImprint(plate, onPlate, 'slot').part, again = slotted(cutPlate, [0.025, 0.05, 0], [0, -1, 0]) as Refusal, across = slotted(cutPlate, [0, 0.05, 0.01], [0, -1, 0]) as Refusal;
    expect([[again.rule, again.need, again.have], [across.rule, across.need, across.have]], 'a second slot 25 mm along, 10 mm across: neither the 30 along nor the 50 across').toEqual([['spacing', 30, 25], ['spacing', 50, 10]]);
    expect(limitsOf('k5', 25, DEVIATION.map((d) => ({ ...d, src: 'planted' }))), 'a deviation read from its own source').toMatchObject({ loUm: 2, hiUm: 11, src: 'planted' });
    // (a square slot along a hub's bore, given at run time: the bore met exactly (a turned part, not its mesh), the slot
    // started where the bore falls away under its sides, 15 − √209 mm in front for 8 mm across a 30 mm bore, sampled along
    // its edges (its corners lie past the hub's ends, over nothing); the hub made 10 mm longer, the slot re-applied through
    // it, met again from across the bore (from far out the ray met the hub's outside first))
    const boreRow: NegativeRow = { of: { kind: 'slot', says: 'a square slot along a bore (a test row)' }, asks: [], lookups: [],
      sides: { bore: { frame: 'surface', tools: [{ role: 'remove', outline: { rect: ['span + 0.02 mm', '8 mm'] }, depth: '3.3 mm', at: ['mid', '0', '0'], why: 'a slot along the bore (derived)' }], checks: [{ check: 'bore', measure: 'value', have: 'free', need: '29.5 mm', most: '30.5 mm', rule: 'the bore 30 mm', source: 'derived' }],
        mirror: { kind: 'keyway', sex: 'holes', takes: 'slot', size: {}, std: 'derived', joint: 'slider' } } }, side: 'bore', sources: ['derived'] };
    const ring = (y1: number): Part => ({ name: 'hub', parts: [{ name: 'hub', shape: { lathe: [[0.015, -0.02], [0.025, -0.02], [0.025, y1], [0.015, y1], [0.015, -0.02]] }, at: [0, 0, 0], mat: 'steel-low' }] });
    const inBore = imprint(ring(0.02), { row: 'slot', size: {} }, [0, 0.0005, 0], [1, 0, 0], { rows: { slot: boreRow } }) as Imprinted;
    expect([inBore.measured.span, inBore.measured.free, inBore.frame.u, inBore.lead[0]].map((x) => (Array.isArray(x) ? x.map((y) => +y.toFixed(9)) : +x!.toFixed(7))), 'the bore 30 across and 40 long, u along it, the lead').toEqual([0.04, 0.03, [0, 1, 0], +(0.015 - Math.sqrt(0.015 ** 2 - 0.004 ** 2)).toFixed(7)]);
    const slottedHub = applyImprint(ring(0.02), inBore, 'slot').part, floor = slottedHub.parts![0]!.cuts![0]!; expect(+((floor.at[0] + floor.depth) * 1000).toFixed(6), 'its floor 18.3 mm from the axis').toBe(18.3);
    const re = reapplyImprints({ ...slottedHub, parts: [{ ...slottedHub.parts![0]!, shape: ring(0.03).parts![0]!.shape }] }, { rows: { slot: boreRow } }), c2 = re.part.parts![0]!.cuts![0]!;
    expect([re.kept, +((Math.max(...c2.sect!.map((p) => p[0])) - Math.min(...c2.sect!.map((p) => p[0]))) * 1000).toFixed(6), +(c2.at[1] * 1000).toFixed(6)], 'kept through the longer hub, its middle moved').toEqual([['slot'], 50.02, 5]);
    // (every expression of every row, and the test row's, comes to a number over its scope; a number followed by a word is
    // a length or an angle (the lexer reads '2 h' as two hours))
    const exsOf = (r: NegativeRow): string[] => { const out: string[] = [], add = (x: unknown) => { if (typeof x === 'string') out.push(x); else if (Array.isArray(x)) x.forEach(add); else if (x && typeof x === 'object') Object.values(x).forEach(add); };
      for (const l of r.let ?? []) add(l.ex); for (const sd of Object.values(r.sides)) { for (const l of sd.let ?? []) add(l.ex); for (const t of sd.tools) { add([t.turned, t.depth, t.at, t.r, t.r0, t.length]); if (t.outline) add(t.outline); }
        for (const z of sd.zones ?? []) add([z.basic, z.lo, z.hi]); for (const c of sd.checks) add([c.have, c.need, c.most, c.at]); add(Object.values(sd.mirror.size)); add(sd.mirror.t); for (const p of sd.adds ?? []) add(p.at); } return out; };
    const units = (r: NegativeRow) => exsOf(r).flatMap((e) => [...e.matchAll(/\d\s+([A-Za-zµ°]+)/g)].map((m) => m[1]!)).filter((u) => !['mm', 'm', 'deg'].includes(u));
    expect(units(row), 'units read as lengths').toEqual([]); expect(units({ ...row, let: [{ name: 'x', ex: '2 h', unit: 'mm', says: '' }] }), 'a unit not a length, planted').toEqual(['h']);
    for (const [k, r] of [...Object.entries(NEGATIVE_ROWS), ['clear', row] as const]) for (const e of exsOf(r)) if (!/[<>=!]|\band\b|\bor\b/.test(e)) {
      const neg = negativeOf({ row: k, size: k === 'clear' ? { thread: 'M8' } : {} }, host, { rows: { [k]: r } }); if ('refused' in neg) continue; // (the rows' own cases give their sizes in their test)
      expect(Number.isFinite(num(e, scopeOf(neg.scope!))), `${k}: ${e}`).toBe(true); }
    // (what rows read is sourced, and written with no placeholder: a table planted without its source is caught)
    expect(unsourced({ TABLES }, 'src/nexus/interfaces.ts'), 'the tables rows read, each with its source').toEqual([]);
    expect(unsourced({ TABLES: { ...TABLES, PLANTED: { rows: { a: { d: 3 } }, unit: { d: 'mm' } } } }, 'planted'), 'a table with no source').toHaveLength(1);
    for (const T of Object.values(TABLES)) expect(TABLE_SOURCES[T.src], `${T.src}: a source held`).toBeTruthy();
    expect(placeholders(readFileSync(join(root, 'src/nexus/interfaces.ts'), 'utf8'), 'src/nexus/interfaces.ts')).toEqual([]);
  });
  // (the rest of R18 as rows (spec 01, I17): the evaluation set's cases 6 and 11 to 14, each asked of its row as the case
  // says (its asks, sizes in mm), give the numbers worked by hand from their sources; each refusal named; every line of why
  // names what it was read from, or says it is derived, or says what is not judged)
  it('the rest of R18 by rows: a bearing\'s seats, a dowel, a key\'s keyways, a pipe port, a panel cut-out give their numbers', async () => {
    type Ask = { row: string; side?: string; size: Record<string, number | string>; host: Record<string, number | string> };
    const set = JSON.parse(readFileSync(join(root, 'evals/interfaces/cases.json'), 'utf8')) as { cases: { case: number; asks?: Ask[]; expect: Record<string, unknown> }[] }, C = (n: number) => set.cases.find((c) => c.case === n)!;
    const mm = 1e-3, SI = (o: Record<string, number | string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? v * mm : v]));
    const all: Negative[] = [], neg = (a: Ask, host: Record<string, number | string> = {}) => negativeOf({ row: a.row, ...(a.side ? { side: a.side } : {}), size: SI(a.size) } as Asking, SI({ ...a.host, ...host }) as { material: string; thickness: number });
    const ok = (a: Ask, host: Record<string, number | string> = {}) => { const r = neg(a, host); expect((r as Refusal).refused && (r as Refusal).why, `${a.row} (${a.side}) made`).toBeFalsy(); all.push(r as Negative); return r as Negative; };
    const no = (a: Ask, host: Record<string, number | string>) => { const r = neg(a, host) as Refusal; expect(r.refused, `${a.row} refused for ${JSON.stringify(host)}`).toBe(true); return [r.rule, r.need, r.have]; };
    const mmOf = (p?: [number, number][]) => p?.map((q) => q.map((v) => +(v / mm).toFixed(3))), lim = (n: Negative, on: string) => { const l = n.limits!.find((x) => x.on === on)!; return [+(l.basic / mm).toFixed(3), l.loUm ?? null, l.hiUm ?? null]; };
    // (case 6: a 6205's housing in a 20 mm plate, its bore and shoulder; in 15 mm the plain bore, no shoulder's limits;
    // 14 mm refused; the shaft's journal k5, its shoulder at least 30.6; the fit with the ring not judged)
    const e6 = C(6).expect, [house, journal] = C(6).asks!, h20 = ok(house!), h15 = ok(house!, { thickness: 15 }), sh = ok(journal!);
    expect(mmOf(h20.tools[0]!.prof), 'the housing\'s bore and shoulder in 20 mm').toEqual([[26, 0], [26, 15], [23.2, 15], [23.2, 20]]);
    expect([lim(h20, 'D'), lim(h20, 'Da'), lim(h20, 'ra')], 'D H7; Da and ra at most').toEqual([[52, ...(e6.housing_um as number[])], [e6.Da_max, null, 0], [e6.ra_max, null, 0]]);
    expect([h20.mirror.takes, +(h20.mirror.t! / mm).toFixed(3), h20.mirror.joint], 'the housing\'s bore takes the ring 52 across, as deep as it is wide, fixed').toEqual(['Ø52', 15, 'fixed']);
    const contact = h20.tools.find((x) => x.role === 'contact')!; expect([contact.r0, contact.r, contact.at![1]].map((v) => +(v! / mm).toFixed(3)), 'the ring bears from 23.2 to 26, 15 in').toEqual([23.2, 26, -15]);
    expect([mmOf(h15.tools[0]!.prof), h15.limits!.map((l) => l.on), no(house!, { thickness: 14 })], 'in 15 mm the plain bore; 14 refused').toEqual([[[26, 0], [26, 15]], ['D'], ['depth', 15, 14]]);
    expect([lim(sh, 'd'), lim(sh, 'da'), sh.fit, sh.why.at(-1), sh.frame], 'the journal k5, its shoulder at least; not judged, said').toEqual([[25, ...(e6.shaft_um as number[])], [e6.da_min, 0, null], undefined, 'the fit not judged: the ring\'s own tolerance (ISO 492) is not held here', 'axis']);
    // (case 11: a 6 mm ISO 8734 dowel's hole: H7 where it locates, G7 where the part comes off; both transitions with m6)
    const e11 = C(11).expect, [loc, rem] = C(11).asks!.map((a) => ok(a));
    expect([mmOf(loc!.tools[0]!.prof), lim(loc!, 'd'), lim(rem!, 'd')], 'holes 6 through 10 mm, H7 and G7').toEqual([[[3, 0], [3, 10]], [6, ...(e11.hole_um as number[])], [6, ...(e11.sliding_um as number[])]]);
    expect([loc!.fit, rem!.fit].map((f) => [f!.kind, f!.mostClearUm, f!.mostTightUm]), 'with the pin m6: transitions (8, 12) and (12, 8)').toEqual([['transition', 8, 12], ['transition', 12, 8]]);
    expect([loc!.mirror.joint, rem!.mirror.joint], 'a joint that locates').toEqual([e11.joint, e11.joint]);
    // (case 12: an 8 × 7 key in a 30 mm shaft: a 40 × 8 slot 4.0 deep, round-ended, N9, the key 0.5 mm below the surface at
    // its middle; the hub's 3.3 deep through its length and a hair past, JS9; a 35 mm shaft refused, no keyway read for it)
    const e12 = C(12).expect, [ks, kh] = C(12).asks!.map((a) => ok(a)), { sectArea } = await import('../../src/nexus/form');
    const area = sectArea(ks!.tools[0]!.sect!) / mm / mm, exact = (40 - 8) * 8 + Math.PI * 16; expect(Math.abs(area / exact - 1), `the slot's outline ${area.toFixed(2)} mm², its stadium ${exact.toFixed(2)}`).toBeLessThan(0.001);
    expect([+(ks!.tools[0]!.depth! / mm).toFixed(3), lim(ks!, 'b'), lim(ks!, 't1'), ks!.adds!.map((a) => [a.words, +(a.at[1] / mm).toFixed(6)])], 'the shaft\'s keyway, its limits, the key it takes').toEqual([e12.t1, [e12.b, ...(e12.shaft_um as number[])], [e12.t1, 0, (e12.t1_tol as number[])[1]! * 1000], [['key 8x7x40', -0.5]]]);
    const hx = kh!.tools[0]!.sect!.map((p) => p[0]); expect([+((Math.max(...hx) - Math.min(...hx)) / mm).toFixed(3), +(kh!.tools[0]!.depth! / mm).toFixed(3), lim(kh!, 'b'), lim(kh!, 't2')], 'the hub\'s keyway').toEqual([40.02, e12.t2, [e12.b, ...(e12.hub_um as number[])], [e12.t2, 0, (e12.t2_tol as number[])[1]! * 1000]]);
    expect((neg({ ...C(12).asks![0]!, size: { d: 35, L: 40, fit: 'normal' } }) as Refusal).why, 'a 35 mm shaft').toMatch(/no KEYWAY row for 10x8/);
    // (case 13: a G 1/2 port in 30 mm of 6061: the 19 mm drill under a chamfer to 21, its point beyond; 18 mm refused by its
    // depth, 22 by its drill's point (derived), a polymer block for want of a row)
    const e13 = C(13).expect, [portAsk] = C(13).asks!, gp = ok(portAsk!);
    expect(+((gp.mirror.size.d as number) / mm).toFixed(3), 'its major, ISO 228-1').toBe(e13.major);
    expect([mmOf(gp.tools[0]!.prof), +(gp.scope!.P! / mm).toFixed(3), +((gp.mirror.size.minor as number) / mm).toFixed(3), gp.mirror.takes, +(gp.mirror.t! / mm).toFixed(3)], 'the port\'s drill, its pitch and minor, its thread').toEqual([[[e13.chamfer, 0].map((v, i) => (i ? v : (v as number) / 2)), [9.5, 1], [9.5, e13.drill_depth_min], [0, e13.drill_point_min]], e13.pitch, e13.minor, 'G1/2', e13.thread_depth_min]);
    expect(['chamfer', 'drill depth', 'thread depth', 'spot face', 'spot face depth'].map((on) => lim(gp, on)), 'its limits').toEqual([[e13.chamfer, 0, (e13.chamfer_tol as number[])[1]! * 1000], [e13.drill_depth_min, 0, null], [e13.thread_depth_min, 0, null], [e13.spot_face_min, 0, null], [e13.spot_face_depth_max, null, 0]]);
    expect([no(portAsk!, { thickness: 18 }), no(portAsk!, { thickness: 22 }), (neg(portAsk!, { material: 'pla' }) as Refusal).why], 'refused: too thin, the point through, a polymer').toEqual([['depth', e13.refused_below, 18], ['drill point', e13.drill_point_min, 22], 'no pipe port (port) row for a polymer']);
    // (case 14: a D22 cut-out in a 2 mm panel: its recess end 12.95 from the middle, its area within +0.1 % of the worked
    // 396.45 mm² (the 64-gon drawn over the circle, never under it); a 7 mm panel refused)
    const e14 = C(14).expect, [cutAsk] = C(14).asks!, co = ok(cutAsk!), pts = co.tools[0]!.sect!, a14 = sectArea(pts) / mm / mm;
    expect([+(Math.max(...pts.map((p) => p[1])) / mm).toFixed(3), a14 >= 396.45 && a14 <= 396.45 * 1.001], `the recess end, the area ${a14.toFixed(2)} mm²`).toEqual([+((e14.across_notch as number) - (e14.hole as number) / 2).toFixed(3), true]);
    expect([lim(co, 'd'), lim(co, 'recess width'), lim(co, 'across the recess'), lim(co, 'corner radius'), co.checks.find((c) => c.check === 'spacing')!.need], 'its limits and its spacing').toEqual([[e14.hole, 0, (e14.hole_tol as number[])[1]! * 1000], [e14.notch_width, 0, (e14.notch_width_tol as number[])[1]! * 1000], [e14.across_notch, 0, (e14.across_notch_tol as number[])[1]! * 1000], [e14.corner_r_max, null, 0], (e14.spacing_min as number[]).map((v) => v * mm)]);
    expect(no(cutAsk!, { thickness: 7 }), 'a 7 mm panel').toEqual(['panel', (e14.panel as number[])[1], e14.refused_panel]);
    for (const n of all) for (const w of n.why) expect(Object.keys(TABLE_SOURCES).some((k) => w.includes(k)) || /derived|not judged/.test(w), `${n.row} (${n.side}): "${w}" names its source`).toBe(true);
  });
  // (the rest of R18 imprinted on real pieces: each case's row stood on its host, cut by I8's applyImprint, the solids made
  // and measured, the new interface found by the asker's own (a 6205's bore, a dowel's shank, a G 1/2 fitting); a key in
  // both keyways not a clash; the panel's spacing refused both ways; the hub made longer keeps its keyway; cases 1 to 5 and
  // 7 to 10 keep their numbers in their own tests above)
  it('the rest of R18 by rows: imprinted, cut, and found by their own interfaces', async () => {
    const { solidsOf } = await import('../../src/nexus/brep'), { sectArea, cutFrame } = await import('../../src/nexus/form'), mm = 1e-3, B6 = { number: '6205', duty: 'rotating inner ring, normal load' };
    const one = (name: string, shape: Part['shape'], mat = 'steel-low'): Part => ({ name, item: name, parts: [{ name, item: name, shape, at: [0, 0, 0], mat }] });
    const lathe = (pts: [number, number][]) => one('shaft', { lathe: pts.map(([r, y]) => [r * mm, y * mm]) as [number, number][] });
    const put = (host: Part, asking: Asking, from: V3, dir: V3) => { const im = imprint(host, asking, from, dir); expect((im as Refusal).why, `${(asking as { row: string }).row}: stood`).toBeUndefined(); return { im: im as Imprinted, ...applyImprint(host, im as Imprinted, (asking as { row: string }).row) }; };
    const housing = one('housing', { box: [0.12, 0.02, 0.12] }), dowelPlate = one('plate', { box: [0.04, 0.01, 0.04] }), shaft = one('shaft', { cyl: [0.015, 0.08] }), block = one('block', { box: [0.04, 0.03, 0.04] }, 'al-6061'), panel = one('panel', { box: [0.1, 0.002, 0.06] });
    const ring = (y1: number) => one('hub', { lathe: [[0.015, -0.02], [0.025, -0.02], [0.025, y1], [0.015, y1], [0.015, -0.02]] }), hub = ring(0.02), journal = lathe([[0, 0], [12.5, 0], [12.5, 15], [16, 15], [16, 40], [0, 40]]);
    const H = put(housing, { row: 'bearing seat', side: 'housing', size: B6 }, [0, 0.5, 0], [0, -1, 0]), J = put(journal, { row: 'bearing seat', side: 'shaft', size: B6 }, [0.001, -0.5, 0.0007], [0, 1, 0]);
    const D = put(dowelPlate, { row: 'dowel hole', size: { d: 0.006, std: 'ISO 8734', hold: 'located' } }, [0, 0.5, 0], [0, -1, 0]), K = { d: 0.03, L: 0.04, fit: 'normal' };
    const KS = put(shaft, { row: 'parallel key', side: 'shaft', size: K }, [0.5, 0, 0], [-1, 0, 0]), KH = put(hub, { row: 'parallel key', side: 'hub', size: K }, [0, 0.0005, 0], [1, 0, 0]);
    const G = put(block, { row: 'pipe port', size: { thread: 'G1/2' } }, [0, 0.5, 0], [0, -1, 0]), P = put(panel, { row: 'panel cut-out', size: { device: 'D22' } }, [0, 0.5, 0], [0, -1, 0]);
    // (the shaft's seat met on its axis at its end face; its journal 12.5 and its shoulder 16 measured exactly; a step to 28
    // refused by the shoulder; a plain 25 bar's shoulder recorded as not applying; a 30 bar refused at the seat)
    expect([J.im.frame.at.map((x) => +x.toFixed(9) + 0), J.im.checks.map((c) => [c.check, c.have, c.applies ?? true])], 'the journal and its shoulder').toEqual([[0, 0, 0], [['depth', 40, true], ['seat', 12.5, true], ['shoulder', 16, true], ['depth', 40, true]]]);
    const seatOn = (pts: [number, number][]) => imprint(lathe(pts), { row: 'bearing seat', side: 'shaft', size: B6 }, [0.001, -0.5, 0.0007], [0, 1, 0]);
    const step = seatOn([[0, 0], [12.5, 0], [12.5, 15], [14, 15], [14, 40], [0, 40]]) as Refusal, plain = seatOn([[0, 0], [12.5, 0], [12.5, 40], [0, 40]]) as Imprinted, fat = seatOn([[0, 0], [15, 0], [15, 40], [0, 40]]) as Refusal;
    expect([[step.rule, step.need, step.have], plain.checks.find((c) => c.check === 'shoulder')!.applies, [fat.rule, fat.need, fat.have]], 'a 28 step, a plain 25, a 30 bar').toEqual([['shoulder', 15.3, 14], false, ['seat', 12.75, 15]]);
    // (the new interfaces found by the asker's own: the 6205's bore takes the journal, a 52 mm shaft (the ring's outside)
    // the housing, the dowel's shank its hole, a G 1/2 fitting the port; a 47 mm shaft and a G 3/8 do not)
    const own = (w: string, kind: string) => portOfInterface(interfacesOf(use(w)).list.find((x) => x.kind === kind)!)!, made = (kind: string, size: Record<string, number | string>) => portOfInterface({ kind, size, frame: { at: [0, 0, 0], n: [0, -1, 0], u: [1, 0, 0] } })!;
    expect([fit(J.port, own('bearing 6205', 'bore')), fit(H.port, made('shaft', { d: 0.052 })), fit(D.port, own('dowel 6x20', 'shaft')), fit(G.port, made('thread.external', { d: 0.020955, thread: 'G1/2' }))].map((f) => typeof f), 'each found').toEqual(['object', 'object', 'object', 'object']);
    expect([fit(H.port, made('shaft', { d: 0.047 })), fit(G.port, made('thread.external', { d: 0.016662, thread: 'G3/8' }))], 'the wrong sizes not').toEqual(['Ø52 is not Ø47', 'G1/2 is not G3/8']);
    // (the keyway's own checks refuse where they should: a slot longer than its shaft runs off its end; a hub whose wall is
    // thinner than its keyway is deep)
    const tooLong = imprint(shaft, { row: 'parallel key', side: 'shaft', size: { ...K, L: 0.1 } }, [0.5, 0, 0], [-1, 0, 0]) as Refusal, thin = imprint(one('hub', { lathe: [[0.015, -0.02], [0.018, -0.02], [0.018, 0.02], [0.015, 0.02], [0.015, -0.02]] }), { row: 'parallel key', side: 'hub', size: K }, [0, 0.0005, 0], [1, 0, 0]) as Refusal;
    expect([[tooLong.rule, tooLong.need], [thin.rule, thin.need, thin.have]], 'a 100 mm slot on an 80 mm shaft; a 3 mm hub wall under a 3.3 mm keyway').toEqual([['length', 0], ['wall', 3.3, 3]]);
    // (the solids valid; on a flat host what the solid loses is the tool's own volume, within 0.1 %)
    const vol = async (p: Part) => { const r = (await solidsOf(p)).rows[0]!; expect(r.ok && r.valid, `${p.name}: made and valid: ${r.why ?? ''}`).toBe(true); return r.volume!; };
    const turned = (prof: [number, number][]) => prof.slice(1).reduce((s, q, i) => { const p = prof[i]!; return s + (Math.PI * Math.abs(q[1] - p[1]) * (p[0] ** 2 + p[0] * q[0] + q[0] ** 2)) / 3; }, 0);
    for (const [host, cut, tool] of [[housing, H.part, turned(H.im.negative.tools[0]!.prof!)], [dowelPlate, D.part, turned(D.im.negative.tools[0]!.prof!)], [block, G.part, turned(G.im.negative.tools[0]!.prof!)], [panel, P.part, sectArea(P.im.negative.tools[0]!.sect!) * 0.002]] as [Part, Part, number][]) {
      const lost = (await vol(host.parts![0]!)) - (await vol(cut.parts![0]!)); expect(Math.abs(lost / tool - 1), `${host.name}: the solid loses ${(lost * 1e9).toFixed(1)} mm³, its tool ${(tool * 1e9).toFixed(1)}`).toBeLessThan(0.001); }
    // (the keyways: the shaft's floor 26.0 from the far side, the hub's 33.3 (exact: the bore met as turned, not drawn), the
    // hub's started 15 − √209 in front where the bore falls away; the mass takes the outline's prism, so on a round host it
    // counts the air in it too (fault D23): over the solid's by between 46.0 and 57.5 mm³ on the shaft (the straight part's
    // air alone, then with its round ends'), by 0 to 1.1 × 116 on the hub)
    const cs = KS.part.parts![0]!.cuts![0]!, ch = KH.part.parts![0]!.cuts![0]!;
    expect([+((cs.at[0] - cs.depth + 0.015) / mm).toFixed(6), +((ch.at[0] + ch.depth + 0.015) / mm).toFixed(6), +(KH.im.lead[0]! / mm).toFixed(4), KH.im.frame.u.map((x) => +x.toFixed(9) + 0)], '26.0, 33.3, the lead, u along the hub\'s axis').toEqual([26, 33.3, +((15 - Math.sqrt(209))).toFixed(4), [0, 1, 0]]);
    for (const [host, cut, lo, hi] of [[shaft, KS.part, 46.0, 57.5], [hub, KH.part, 0, 1.1 * 116]] as [Part, Part, number, number][]) {
      const rho = 7850, byMass = ((massOf(host) - massOf(cut)) / rho) * 1e9, bySolid = ((await vol(host.parts![0]!)) - (await vol(cut.parts![0]!))) * 1e9;
      expect(byMass - bySolid, `${host.name}: the mass takes ${byMass.toFixed(1)} mm³, the solid ${bySolid.toFixed(1)}`).toBeGreaterThanOrEqual(lo); expect(byMass - bySolid).toBeLessThanOrEqual(hi); }
    // (the panel's cut-out: its recess (the middle of its end, the farthest of its points) toward +w (n × u); a second refused 25 mm along u (30 asked) and 25 along w (50))
    const pc = P.part.parts![0]!.cuts![0]!, f = cutFrame(pc), ends = [...pc.sect!].sort((a, b) => Math.hypot(...b) - Math.hypot(...a)).slice(0, 2), far = [(ends[0]![0] + ends[1]![0]) / 2, (ends[0]![1] + ends[1]![1]) / 2] as [number, number], toward = f.u.map((x, i) => x * far[0] + f.w[i]! * far[1]), w = [P.im.frame.n[1] * P.im.frame.u[2] - P.im.frame.n[2] * P.im.frame.u[1], P.im.frame.n[2] * P.im.frame.u[0] - P.im.frame.n[0] * P.im.frame.u[2], P.im.frame.n[0] * P.im.frame.u[1] - P.im.frame.n[1] * P.im.frame.u[0]];
    expect(toward.reduce((s, x, i) => s + x * w[i]!, 0) / Math.hypot(...toward), 'the recess toward +w').toBeGreaterThan(0.999);
    const again = (x: number, z: number) => { const r = imprint(P.part, { row: 'panel cut-out', size: { device: 'D22' } }, [x, 0.5, z], [0, -1, 0]) as Refusal; return [r.rule, r.need, r.have]; };
    expect([again(0.025, 0), again(0, 0.025)], 'too near along a row, and between rows').toEqual([['spacing', 30, 25], ['spacing', 50, 25]]);
    // (the hub made 10 mm longer: its keyway made again through its whole length, its middle moved with it (R10))
    const re = reapplyImprints({ ...KH.part, parts: [{ ...KH.part.parts![0]!, shape: ring(0.03).parts![0]!.shape }] }), c2 = re.part.parts![0]!.cuts![0]!, xs = c2.sect!.map((p) => p[0]);
    expect([re.kept, +((Math.max(...xs) - Math.min(...xs)) / mm).toFixed(3), +(c2.at[1] / mm).toFixed(6), H.part.parts![0]!.imprints![0]!.limits!.map((l) => l.on)], 'kept through 50.02 mm; the limits on the record').toEqual([['parallel key'], 50.02, 5, ['D', 'Da', 'ra']]);
  }, 180_000);
  // (the interfaces evaluation set (spec 01, I15; design §4): its twelve cases, the design's rows in order, each with its
  // numbers worked out by hand from its sources; each named by the tests that run it, or waiting on the task that will
  // build it, its numbers then held to themselves and to the ISO 286 tolerances the app holds)
  it('the interfaces evaluation set: every case of the design, worked by hand, run or waiting', () => {
    type Case = { case: number; what: string; expect: Record<string, number | string | number[]>; worked?: string; by?: string[]; waits?: string; sources?: { url: string; publisher: string }[] };
    const set = JSON.parse(readFileSync(join(root, 'evals/interfaces/cases.json'), 'utf8')) as { cases: Case[] }, design = readFileSync(join(root, 'plan/specs/01-interfaces/design.md'), 'utf8');
    const sec = design.slice(design.indexOf('## 4. How we will know'), design.indexOf('## 5.')), rows = sec.split('\n').filter((l) => /^\| [a-z]/.test(l) && !/^\| Case/.test(l)).map((l) => l.split('|')[1]!.trim());
    expect(set.cases.map((c) => c.case), 'the design\'s cases, in order').toEqual(rows.map((_, k) => k + 1));
    expect(rows.length, 'the design\'s rows: its first twelve, then a pipe port and a cut-out (spec 01, I17)').toBe(14); set.cases.forEach((c, k) => expect(c.what.startsWith(rows[k]!), `case ${c.case} is the design's row ${k + 1}: "${rows[k]}"`).toBe(true));
    const tests = new Set([...readFileSync(join(root, 'tests/nexus/domains.test.ts'), 'utf8').matchAll(/^  it\('((?:[^'\\]|\\.)*)'/gm)].map((m) => m[1]!.replace(/\\'/g, "'")));
    const tasks = new Map((JSON.parse(readFileSync(join(root, 'plan/specs/01-interfaces/tasks.json'), 'utf8')) as { tasks: { id: string; status: string }[] }).tasks.map((t) => [`01.${t.id}`, t.status]));
    for (const c of set.cases) {
      // (its numbers (an expect) and how they were worked (a worked), on the case or in the record it is run by)
      const found = { worked: [] as string[], expect: 0 }, walk = (o: unknown): void => { if (!o || typeof o !== 'object') return; for (const [k, v] of Object.entries(o)) { if (k === 'worked' && typeof v === 'string') found.worked.push(v); else if (k === 'expect' && v && typeof v === 'object') found.expect += Object.keys(v).length; walk(v); } };
      walk(c); expect(found.worked.some((w) => w.length > 40) && found.expect > 0, `case ${c.case}: its numbers and how they were worked`).toBe(true);
      if (c.by) { expect(c.by.length, `case ${c.case}: the tests that run it`).toBeGreaterThan(0); for (const t of c.by) expect(tests.has(t), `case ${c.case}: the test "${t}" is in the gate`).toBe(true); continue; }
      expect(c.waits && tasks.has(c.waits) && tasks.get(c.waits) !== 'passing', `case ${c.case}: run by a test, or waiting on a task not yet passing (${c.waits})`).toBe(true);
      expect((c.sources ?? []).filter((x) => /^https:\/\//.test(x.url)).length, `case ${c.case}: its sources`).toBeGreaterThanOrEqual(2);
    }
    // (the waiting cases held to themselves: each pair of limits spans its IT grade; and to the tolerances the app holds)
    const e = (n: number) => set.cases.find((c) => c.case === n)!.expect, span = (x: unknown) => (x as number[])[1]! - (x as number[])[0]!, it = (d: number, g: number) => Math.round(itTolerance(d, g).um);
    const b6 = e(6); expect([span(b6.shaft_um), span(b6.housing_um)], 'k5 and H7 span IT5 and IT7').toEqual([b6.IT5_18_30, b6.IT7_50_80]); expect([it(25, 5), it(52, 7)], 'the app\'s IT5 at 25 mm, IT7 at 52 mm').toEqual([b6.IT5_18_30, b6.IT7_50_80]);
    const d11 = e(11); expect([span(d11.pin_um), span(d11.hole_um), span(d11.sliding_um)], 'm6, H7, G7 span IT6, IT7, IT7').toEqual([d11.IT6_3_6, d11.IT7_3_6, d11.IT7_3_6]);
    expect(d11.pin_mm, 'the pin\'s limits, 6 mm and its deviations').toEqual((d11.pin_um as number[]).map((u) => +(6 + u / 1000).toFixed(3))); expect(it(6, 7), 'the app\'s IT7 at 6 mm').toBe(d11.IT7_3_6);
    // (where the app's formula and ISO 286's table differ, the fault is open and named)
    if (it(6, 6) !== d11.IT6_3_6) expect(readFileSync(join(root, 'plan/DEFECTS.md'), 'utf8'), 'the app\'s IT6 at 6 mm is not the table\'s: fault D17 open').toMatch(/^\| D17 \|.*\| open \|/m);
    const k12 = e(12); expect([span(k12.shaft_um), span(k12.hub_um), it(8, 9)], 'N9 and JS9 span IT9 at 8 mm, as the app gives it').toEqual([k12.IT9_6_10, k12.IT9_6_10, k12.IT9_6_10]);
    expect([k12.d_minus_t1, k12.d_plus_t2], 'under the shaft\'s keyway and over the hub\'s, at 30 mm').toEqual([30 - (k12.t1 as number), 30 + (k12.t2 as number)]); expect((k12.hub_um as number[])[0], 'JS9 about zero').toBe(-(k12.hub_um as number[])[1]!);
  });
  // (a bolted joint bores the plies in its grip, and only those seated in it (fault D14))
  it('a bolted joint bores the plies in its grip', () => {
    // (two 6 mm plates between an M8's washers are each holed (ISO 273 medium, 9 mm); a plate drawn 1 mm into the head's
    // washer is left unbored; every machine is made so (`boreGrips` at the end of machines.ts's made))
    const ply = (name: string, y: number): Part => ({ name, item: 'flat bar 60x6', shape: { box: [0.06, 0.006, 0.06] }, at: [0, y, 0], mat: 'steel-low' });
    const j12 = { ...boltedJoint('M8', 12), name: 'the M8 joint' }, h = 0.0016;
    const good = boreGrips({ name: 'two plates', parts: [ply('plate one', -h - 0.003), ply('plate two', -h - 0.009), j12] });
    expect([good.joints, good.holes], 'one joint, a hole in each plate').toEqual([1, 2]);
    expect(good.part.parts!.slice(0, 2).map((p) => (p.cuts ?? []).map((c) => +(2 * c.r * 1000).toFixed(2))), 'each 9 mm across').toEqual([[9], [9]]);
    const off = boreGrips({ name: 'a plate in the washer', parts: [ply('plate one', -h - 0.002), ply('plate two', -h - 0.009), j12] });
    expect(off.part.parts![0]!.cuts, 'the plate drawn into the washer: not bored').toBeUndefined();
  }, 60_000);
  // (nothing checks for overlap (decision 0021, the user, 2026-11-02): where a place is still written by hand is counted
  // instead, builder by builder, and no count may rise; a builder moved onto the operations that cannot write an overlap
  // counts 0. `node scripts/by-hand.mjs` lists them; `--write` keeps the counts once they fall)
  it('places written by hand only fall', () => {
    const now = byHand(), was = JSON.parse(readFileSync(LIMITS, 'utf8')) as Record<string, number>;
    expect(Object.entries(now).filter(([f, n]) => n > (was[f] ?? 0)).map(([f, n]) => `${f}: ${was[f] ?? 0} → ${n}`), 'a place written by hand where there were fewer').toEqual([]);
    expect(readFileSync(join(root, 'src/nexus/make/rules.ts'), 'utf8'), 'nothing checks for overlap').not.toMatch(/\b(interference|clearances|rulesThrough|meshClashes)\(/);
  });
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
