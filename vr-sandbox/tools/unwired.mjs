#!/usr/bin/env node
// `node tools/unwired.mjs` — what is built and cannot be reached: exports no running path arrives at.
//
// THIS IS THE MEASUREMENT THAT WOULD HAVE FOUND `mobility()` FOUR ROUNDS AGO. `parts/mechanism.ts` holds a
// rank-based degrees-of-freedom solver — joints by what they leave free, redundant constraints reported, Grübler's
// formula deliberately rejected — fully tested, and every call to it in the repository was inside its own unit test.
// So nothing made had ever been asked how many ways it could move, and the gate was green the whole time: **a
// passing test is indistinguishable from a working feature when the test is the only caller** (docs/ROUNDS.md 7r).
//
// The first draft of this file got its own answer wrong, which is why the method below is spelt out. It reported
// `makeMachine` as unreachable because nothing OUTSIDE `machines.ts` names it — and `VEHICLE_KITS`, in that same
// file, calls it on every car the kit route builds. "No caller outside its own file" is not "unreachable", and
// printing one as the other is the confident wrong number this tool exists to prevent.
//
// So reachability is computed, not inferred from one grep:
//
//   1. the DOORS are the real entry points — `src/nexus/cli/*.ts` (every npm script) and `src/nexus/view/*.ts`
//      (every page the browser loads). Nothing else starts execution.
//   2. walk `import`/`export … from` transitively from the doors: that is the set of modules a running path reaches.
//   3. an export is LIVE if any other reached module names it; LIVE (INTERNAL) if only its own reached file does,
//      which is how `makeMachine` is reached; TEST-ONLY if only `tests/` names it; DEAD if nothing names it.
//
// Test-only and dead are the two that matter, and they mean different things: dead is debt, test-only is finished
// work with no door. Neither is automatically wrong — a constant a kit will use next round is test-only and fine —
// so this prints a census and a verdict, not a pass or a fail. The point is that the question now costs one second.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.(ts|mjs|js)$/.test(p) ? [p] : []; });
const SRC = walk(join(ROOT, 'src/nexus')).filter((p) => !/\.d\.ts$/.test(p));
const TESTS = walk(join(ROOT, 'tests'));
const TOOLS = walk(join(ROOT, 'tools')).filter((p) => !/unwired\.mjs$/.test(p));
const read = (p) => readFileSync(p, 'utf8');
const rel = (p) => relative(ROOT, p);
const only = process.argv.slice(2).find((a) => !a.startsWith('--'));

// 1. THE DOORS
const DOORS = SRC.filter((p) => /\/(cli|view)\/[^/]+\.ts$/.test(p));

// 2. WHAT A RUNNING PATH REACHES. A specifier is resolved against the importing file; `.ts` and `/index.ts` are
// tried, and anything that does not land inside src/nexus (three, a package) is not ours to walk.
const resolveSpec = (from, spec) => {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(from), spec);
  for (const c of [`${base}.ts`, join(base, 'index.ts'), base]) if (SRC.includes(c)) return c;
  return null;
};
const REACHED = new Set();
const queue = [...DOORS];
while (queue.length) {
  const f = queue.pop();
  if (REACHED.has(f)) continue;
  REACHED.add(f);
  for (const m of read(f).matchAll(/(?:^|\n)\s*(?:import|export)[^;\n]*?from\s*['"]([^'"]+)['"]/g)) {
    const t = resolveSpec(f, m[1]);
    if (t && !REACHED.has(t)) queue.push(t);
  }
  // A SIDE-EFFECT IMPORT HAS NO `from`. `import '../world/creatures';` registers that file's kits and is the whole
  // reason it runs; the walk above cannot see it, and the first run of this tool therefore called `world/creatures.ts`
  // unreachable while `ask/machine.ts:684` says in plain words that `view/look.ts` imports it for exactly that effect.
  // Three false-positive classes in one tool — the word-as-caller, the own-file caller, and this — all found by
  // checking its answer against a case whose answer was already known. That is the only way a census earns belief.
  for (const m of read(f).matchAll(/(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g)) { const t = resolveSpec(f, m[1]); if (t && !REACHED.has(t)) queue.push(t); }
  for (const m of read(f).matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) { const t = resolveSpec(f, m[1]); if (t && !REACHED.has(t)) queue.push(t); }
}

// 3. EVERY EXPORT, AND WHO NAMES IT. Types and interfaces are left out: they have no caller to have, and counting
// them would bury the things that RUN and are never run.
const EXPORTS = [];
for (const f of SRC) {
  const s = read(f);
  for (const [re, kind] of [[/^export (?:async )?function (\w+)/gm, 'function'], [/^export const (\w+)\s*[:=]/gm, 'const'], [/^export class (\w+)/gm, 'class']])
    for (const m of s.matchAll(re)) EXPORTS.push({ name: m[1], file: f, kind, decl: (s.slice(0, m.index).match(/\n/g) ?? []).length + 1 });
}
// IT COUNTS IMPORTS, NOT THE WORD. The draft before this used `\bname\b` over each file's text and reported
// `mobility` as live, naming `ask/conceive.ts` — which has `'mobility'` as a NeedKind string and in nine comments,
// and calls nothing. A string literal, a type member and a comment are not callers, and a tool that counts them is
// the confident wrong number again, this time inside the instrument built to find confident wrong numbers. So a
// module uses an export only if it IMPORTS it from the declaring file: named, renamed, or through a namespace it
// then dots. That is exact, and it is the same question the module graph above already answers.
const importsOf = (f) => {
  const s = read(f), out = [];                                 // [{ from: resolved path | null, names: [...], ns: string | null }]
  for (const m of s.matchAll(/(?:^|\n)\s*(?:import|export)\s+(type\s+)?({[^}]*}|\*\s+as\s+\w+|\w+)\s*(?:,\s*({[^}]*}))?\s*from\s*['"]([^'"]+)['"]/g)) {
    const from = resolveSpec(f, m[4]), clause = [m[2], m[3]].filter(Boolean).join(',');
    const ns = /\*\s+as\s+(\w+)/.exec(clause)?.[1] ?? null;
    const names = [...clause.matchAll(/(\w+)(?:\s+as\s+(\w+))?/g)].map((x) => x[1]).filter((n) => n && !['type', 'as', 'default'].includes(n));
    out.push({ from, names, ns });
  }
  return out;
};
const IMPORTS = new Map([...SRC, ...TESTS].map((f) => [f, importsOf(f)]));
const namesIn = (name, files, except) => files.filter((f) => {
  if (f === except) return false;
  const im = IMPORTS.get(f) ?? importsOf(f);
  for (const i of im) {
    if (i.from !== except) continue;                            // only an import FROM the declaring file counts
    if (i.names.includes(name)) return true;
    if (i.ns && new RegExp(`\\b${i.ns}\\.${name}\\b`).test(read(f))) return true;
  }
  return false;
});
// a tool is JavaScript against the built bundle, so it cannot import from src: there the call form is the evidence
const toolCalls = (name) => TOOLS.filter((f) => new RegExp(`\\b${name}\\s*\\(`).test(read(f)));
const ownUses = (e) => { const s = read(e.file).split('\n'); return s.filter((l, i) => i + 1 !== e.decl && new RegExp(`\\b${e.name}\\b`).test(l)).length; };

const rows = EXPORTS.map((e) => {
  const outside = namesIn(e.name, SRC, e.file).filter((f) => REACHED.has(f));
  const inTests = namesIn(e.name, TESTS, e.file), inTools = toolCalls(e.name);
  const reachedFile = REACHED.has(e.file);
  const verdict = outside.length ? 'live' : reachedFile && ownUses(e) ? 'live (internal)' : inTools.length ? 'live (a tool calls it)' : inTests.length ? 'test-only' : 'dead';
  return { ...e, verdict, outside, inTests, inTools, reachedFile };
});

const of = (v) => rows.filter((r) => r.verdict === v);
const group = (list) => { const m = new Map(); for (const r of list) m.set(rel(r.file), [...(m.get(rel(r.file)) ?? []), r.name]); return [...m].sort((a, b) => b[1].length - a[1].length); };

if (only) {
  const hits = rows.filter((r) => new RegExp(only, 'i').test(r.name) || new RegExp(only, 'i').test(rel(r.file)));
  console.log(`unwired: ${hits.length} export${hits.length === 1 ? '' : 's'} matching /${only}/i`);
  for (const r of hits) console.log(`  ${r.verdict.padEnd(22)} ${r.name}  ${rel(r.file)}:${r.decl}${r.outside.length ? `  ← ${r.outside.slice(0, 3).map(rel).join(', ')}` : r.inTests.length ? `  ← only ${r.inTests.map(rel).join(', ')}` : ''}`);
  console.log(`UNWIRED: ${hits.filter((h) => h.verdict === 'test-only' || h.verdict === 'dead').length} of ${hits.length} shown are unreachable`);
  process.exit(0);
}

const unreachedModules = SRC.filter((f) => !REACHED.has(f));
console.log(`unwired: ${EXPORTS.length} exported functions, consts and classes across ${SRC.length} files; ${REACHED.size} of those files are reached from the ${DOORS.length} doors (src/nexus/cli, src/nexus/view)`);
console.log('');
console.log(`${of('test-only').length} exports are named by nothing but tests/ — finished work with no door:`);
for (const [file, names] of group(of('test-only')).slice(0, 14)) console.log(`  ${file}  ${names.slice(0, 9).join(', ')}${names.length > 9 ? ` (+${names.length - 9})` : ''}`);
if (group(of('test-only')).length > 14) console.log(`  … ${group(of('test-only')).length - 14} more files`);
console.log('');
console.log(`${of('dead').length} exports are named nowhere at all, tests included:`);
for (const [file, names] of group(of('dead')).slice(0, 10)) console.log(`  ${file}  ${names.slice(0, 9).join(', ')}${names.length > 9 ? ` (+${names.length - 9})` : ''}`);
console.log('');
console.log(`${unreachedModules.length} whole files are not reached from any door${unreachedModules.length ? ':' : '.'}`);
for (const f of unreachedModules.slice(0, 12)) console.log(`  ${rel(f)}`);
if (unreachedModules.length > 12) console.log(`  … ${unreachedModules.length - 12} more`);
console.log('');
console.log(`live: ${of('live').length} called across modules, ${of('live (internal)').length} only inside their own reached file, ${of('live (a tool calls it)').length} by a tool`);
console.log(`UNWIRED: ${of('test-only').length} test-only, ${of('dead').length} dead, ${unreachedModules.length} unreached files, of ${EXPORTS.length} exports`);
