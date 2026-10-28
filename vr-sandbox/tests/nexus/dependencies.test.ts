// The dependency map (docs/REALITY.md, step 0), written from the code itself so it cannot drift: every law and which of
// the engines holds it (the book's terms, the closures the nodes run, a node); the quantities laws share, read from their
// ports (the start of step 2's registry), and the letters that mean different things in different laws; every material
// table and which files read it. Kept current here; write it again with
//   UPDATE_DEPS=1 npx vitest run tests/nexus/dependencies.test.ts

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import '../../src/nexus/seeds';
import { BOOK, KEPT, SLICE, UNIVERSAL } from '../../src/nexus/book';
import { LAWS } from '../../src/ganglia/laws';
import { LIBRARY } from '../../src/nexus/blocks';
import { dimOf, dimText } from '../../src/nexus/dimension';

const root = join(__dirname, '../..'), update = !!process.env['UPDATE_DEPS'];
const files = (d = join(root, 'src'), out: string[] = []): string[] => { for (const x of readdirSync(d)) { const p = join(d, x); if (statSync(p).isDirectory()) files(p, out); else if (p.endsWith('.ts')) out.push(p); } return out; };

/** The material tables, where each is defined, and the names others read it by. */
const TABLES: { table: string; file: string; names: string[]; holds: string }[] = [
  { table: 'handbook materials', file: 'src/data/materials.ts', names: ['MATERIALS', 'GROUND_MATERIALS', 'getMaterial', 'FLUIDS'], holds: 'E, ν, yield, ultimate, elongation, conductivity, friction, restitution, colour; source and confidence; ids like steel.a36' },
  { table: 'thermal', file: 'src/engineering/thermal.ts', names: ['thermalOf', 'heatLoss', 'AMBIENT'], holds: 'c, k, emissivity by handbook id' },
  { table: 'fusion', file: 'src/engineering/fusion.ts', names: ['FUSION', 'fusible'], holds: 'melting, expansion, bond, base element by handbook id' },
  { table: 'density', file: 'src/nexus/mass.ts', names: ['DENSITY', 'massOf'], holds: 'density by the ids parts carry (typical)' },
  { table: 'composition', file: 'src/nexus/elements.ts', names: ['makeup', 'elementsOf', 'makeupSays', 'ELEMENTS', 'formula'], holds: 'alloys, formulas, blends down to elements, by the ids parts carry' },
  { table: 'service limit', file: 'src/nexus/make/rules.ts', names: ['MAX_SERVICE'], holds: 'most service temperature, °C, by the ids parts carry' },
  { table: 'strength map', file: 'src/nexus/loads.ts', names: ['strengthOf'], holds: 'part id → handbook grade for yield, ultimate, E (14 mapped)' },
  { table: 'friction map', file: 'src/nexus/sim.ts', names: ['surfaceOf'], holds: 'part id → handbook grade for friction and bounce, by spelling' },
  { table: 'words to matter', file: 'src/nexus/kinds/core.ts', names: ['MATTER'], holds: 'a word → inventory id, density, label' },
  { table: 'spring wires', file: 'src/engineering/springs.ts', names: ['SPRING_WIRES'], holds: 'ASTM spring wires: A, m, G, E, density' },
  { table: 'adhesives', file: 'src/engineering/joining.ts', names: ['ADHESIVES'], holds: 'adhesives by the handbook categories' },
  { table: 'liquids', file: 'src/engineering/motorrun.ts', names: ['LIQUIDS'], holds: 'density, c, viscosity, k of four liquids' },
  { table: 'gases', file: 'src/nexus/aware/gas.ts', names: ['SUBSTANCES'], holds: 'molar mass, smell, harm, flammable limits' },
  { table: 'edges', file: 'src/nexus/finish.ts', names: ['ruleFor', 'EDGE_RULES'], holds: 'edge radius by material' },
];
/** Where numbers are solved for or stepped through time, each its own code today (step 1 joins them). */
const NUMERIC: { what: string; at: string; find: RegExp }[] = [
  { what: 'a law solved for an input (bisection)', at: 'src/nexus/law.ts', find: /export function invert/ },
  { what: 'a law solved for an input (rearranged, else bisection)', at: 'src/nexus/lawgraph.ts', find: /export function solve/ },
  { what: 'internal rate of return (bisection, 200 steps)', at: 'src/nexus/blocks.ts', find: /id: 'fin\.irr'/ },
  { what: 'an integral by Simpson\'s rule, its error by halving', at: 'src/nexus/evaluate.ts', find: /simpson|Simpson/ },
  { what: 'a PID loop stepped in time', at: 'src/nexus/blocks.ts', find: /id: 'ctrl\.pid'/ },
  { what: 'a battery drained in time', at: 'src/engineering/battery.ts', find: /export function/ },
  { what: 'a motor run in time', at: 'src/engineering/motorrun.ts', find: /export function runMotor/ },
  { what: 'warming in substeps', at: 'src/engineering/thermal.ts', find: /export function warm/ },
  { what: 'heat through a grid (implicit, Gauss–Seidel: a field solver)', at: 'src/nexus/heatflow.ts', find: /export function/ },
];

function mapText(): string {
  const L: string[] = ['# The dependency map', '', 'Written from the code by `tests/nexus/dependencies.test.ts` (step 0 of `docs/REALITY.md`); the test fails when it is out of date (`UPDATE_DEPS=1 npx vitest run tests/nexus/dependencies.test.ts`).', ''];
  // ---- laws ----
  const closure = new Set(LAWS.map((l) => l.id)), node = new Set([...LIBRARY.values()].filter((b) => b.kind === 'law').map((b) => b.id.replace(/^law\./, '')));
  const field = new Map<string, string>(); for (const [k, ls] of Object.entries(KEPT)) for (const l of ls) field.set(l.id, k); for (const l of SLICE) field.set(l.id, 'derived (slice)'); for (const l of UNIVERSAL) field.set(l.id, 'universal');
  const fields = [...new Set(field.values())];
  L.push('## Laws and the engines that hold them', '', `${BOOK.length} laws in the book (terms: dimensions checked, domains, derivations); ${LAWS.length} as closures; ${node.size} as nodes (built from the closures). In the book only: ${BOOK.filter((l) => !closure.has(l.id)).length}. As closures only: ${LAWS.filter((l) => !BOOK.some((b) => b.id === l.id)).length}.`, '', '| Field | In the book | Also a closure and a node | Only in the book |', '| --- | --- | --- | --- |');
  for (const f of fields) { const ls = BOOK.filter((l) => field.get(l.id) === f); L.push(`| ${f} | ${ls.length} | ${ls.filter((l) => closure.has(l.id) && node.has(l.id)).length} | ${ls.filter((l) => !closure.has(l.id)).length} |`); }
  for (const f of fields) {
    L.push('', `### ${f}`, '', '| Law | Variables (symbol: what, unit) | Gives | Engines |', '| --- | --- | --- | --- |');
    for (const l of BOOK.filter((x) => field.get(x.id) === f)) L.push(`| \`${l.id}\` ${l.name} | ${l.inputs.map((p) => `${p.sym}: ${p.name}, ${p.unit || '1'}`).join('; ')} | ${l.output.sym}: ${l.output.name}, ${l.output.unit || '1'} | book${closure.has(l.id) ? ', closure' : ''}${node.has(l.id) ? ', node' : ''} |`);
  }
  // ---- quantities shared ----
  const ports = BOOK.flatMap((l) => [...l.inputs, l.output].map((p) => ({ l: l.id, ...p, dim: dimText(dimOf(p.unit)) })));
  const norm = (n: string) => n.toLowerCase().replace(/^(the|a|an) /, '').replace(/\s+/g, ' ').trim();
  const byQ = new Map<string, Set<string>>(); for (const p of ports) { const k = `${norm(p.name)} [${p.dim}]`; (byQ.get(k) ?? byQ.set(k, new Set()).get(k)!).add(p.l); }
  const shared = [...byQ].filter(([, s]) => s.size > 1).sort((a, b) => b[1].size - a[1].size);
  L.push('', '## Quantities the laws share (by name and dimension, as their ports say them)', '', `${byQ.size} distinct names-with-dimension across ${ports.length} ports; ${shared.length} shared by two laws or more. Step 2 makes these one registry; the names below are the laws' own words, so one quantity can appear under several names.`, '', '| Quantity [dimension] | Laws |', '| --- | --- |');
  for (const [k, s] of shared) L.push(`| ${k} | ${s.size}: ${[...s].slice(0, 8).map((x) => `\`${x}\``).join(', ')}${s.size > 8 ? ', …' : ''} |`);
  const bySym = new Map<string, Set<string>>(); for (const p of ports) (bySym.get(p.sym) ?? bySym.set(p.sym, new Set()).get(p.sym)!).add(`${norm(p.name)} [${p.dim}]`);
  const clashes = [...bySym].filter(([, s]) => new Set([...s].map((x) => x.slice(x.indexOf('[')))).size > 1).sort((a, b) => b[1].size - a[1].size);
  L.push('', '### One letter, different things', '', `${clashes.length} symbols stand for quantities of different dimensions in different laws: joining laws by the letter would join the wrong things, so they are joined by the quantity.`, '', '| Symbol | Means |', '| --- | --- |');
  for (const [k, s] of clashes) L.push(`| ${k} | ${[...s].slice(0, 6).join('; ')}${s.size > 6 ? '; …' : ''} |`);
  // ---- material tables and who reads them ----
  const src = files().map((f) => ({ f: relative(root, f), text: readFileSync(f, 'utf8') }));
  L.push('', '## Material tables and the code that reads them', '', '| Table | Defined in | Holds | Read by |', '| --- | --- | --- | --- |');
  for (const t of TABLES) {
    const readers = src.filter((x) => x.f !== t.file && t.names.some((n) => new RegExp(`import[^;]*\\b${n}\\b[^;]*from '[^']*${t.file.replace(/^src\//, '').replace(/\.ts$/, '').split('/').pop()}'`).test(x.text))).map((x) => `\`${x.f.replace(/^src\//, '')}\``);
    L.push(`| ${t.table} | \`${t.file}\` | ${t.holds} | ${readers.length ? readers.join(', ') : '**nothing**'} |`);
  }
  // ---- numeric ----
  L.push('', '## Where numbers are solved for or stepped in time', '', '| What | Where | Found |', '| --- | --- | --- |');
  for (const n of NUMERIC) { const x = src.find((s) => s.f === n.at); L.push(`| ${n.what} | \`${n.at}\` | ${x && n.find.test(x.text) ? 'yes' : '**not found**'} |`); }
  return L.join('\n') + '\n';
}

describe('the dependency map', () => {
  it('is current', () => {
    const want = mapText(), path = join(root, 'docs/DEPENDENCIES.md');
    if (update) writeFileSync(path, want);
    expect(readFileSync(path, 'utf8'), 'out of date: UPDATE_DEPS=1 npx vitest run tests/nexus/dependencies.test.ts').toBe(want);
  });
});
