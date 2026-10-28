// The dependency map (docs/REALITY.md, step 0), written from the code itself so it cannot drift: every law and which of
// the engines holds it (the book's terms, the closures the nodes run, a node); the quantities laws share, read from their
// ports (the start of step 2's registry), and the letters that mean different things in different laws; every material
// table and which files read it. Kept current here; write it again with
//   UPDATE_DEPS=1 npx vitest run tests/nexus/dependencies.test.ts

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import '../../src/nexus/seeds';
import { BOOK, KEPT, KINDS, SLICE, UNIVERSAL } from '../../src/nexus/book';
import { QUANTITIES, quantityOf } from '../../src/nexus/quantities';
import { LAWS } from '../../src/ganglia/laws';
import { LIBRARY } from '../../src/nexus/blocks';

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
/** Where numbers are solved for or stepped through time, and whether each goes through the numeric layer
 *  (src/nexus/numeric.ts, step 1); those that stay their own code say why. */
const NUMERIC: { what: string; at: string; find: RegExp; stays?: string }[] = [
  { what: 'a law solved for an input', at: 'src/nexus/law.ts', find: /root\(f, \{ method: 'bisection'/ },
  { what: 'a law solved for an input (rearranged where it can be, else inverted)', at: 'src/nexus/lawgraph.ts', find: /invertFound\(/ },
  { what: 'internal rate of return', at: 'src/nexus/blocks.ts', find: /id: 'fin\.irr'[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*root\(npv/ },
  { what: 'an integral in a term (Simpson\'s rule, its error by halving)', at: 'src/nexus/evaluate.ts', find: /simpsonRule\(/ },
  { what: 'a PID loop\'s plant stepped in time', at: 'src/nexus/blocks.ts', find: /stepOde\(method/ },
  { what: 'roots, integrals, slopes and paths on a board', at: 'src/nexus/blocks.ts', find: /id: 'math\.ode'/ },
  { what: 'a battery drained', at: 'src/engineering/battery.ts', find: /export function drain/, stays: 'one step of charge counted (I dt over the capacity at that rate): no equation to solve' },
  { what: 'a motor run in time', at: 'src/engineering/motorrun.ts', find: /export function runMotor/, stays: 'its steps switch between spin-up and a steady state, with events (overheating, the rise time) and energy counted each step; kept until a stepper with events replaces it whole, its results held by the baseline' },
  { what: 'warming in substeps', at: 'src/engineering/thermal.ts', find: /export function warm/, stays: 'a frame\'s step of a part cooling, its sub-step limited so it never crosses the room\'s temperature: called each frame, not run over a span' },
  { what: 'heat through a grid', at: 'src/nexus/heatflow.ts', find: /export function/, stays: 'a field solver (implicit, Gauss–Seidel over cells), not one equation in time' },
];

function mapText(): string {
  const L: string[] = ['# The dependency map', '', 'Written from the code by `tests/nexus/dependencies.test.ts` (step 0 of `docs/REALITY.md`); the test fails when it is out of date (`UPDATE_DEPS=1 npx vitest run tests/nexus/dependencies.test.ts`).', ''];
  // ---- laws ----
  const closure = new Set(LAWS.map((l) => l.id)), node = new Set([...LIBRARY.values()].filter((b) => b.kind === 'law').map((b) => b.id.replace(/^law\./, '')));
  const field = new Map<string, string>(); for (const [k, ls] of Object.entries(KEPT)) for (const l of ls) field.set(l.id, k); for (const l of SLICE) field.set(l.id, 'derived (slice)'); for (const l of UNIVERSAL) field.set(l.id, 'universal');
  const fields = [...new Set(field.values())];
  L.push('## Laws and the engines that hold them', '', `${BOOK.length} laws in the book (terms: dimensions checked, domains, derivations); ${LAWS.length} as closures; ${node.size} as nodes (built from the closures). In the book only: ${BOOK.filter((l) => !closure.has(l.id)).length}. As closures only: ${LAWS.filter((l) => !BOOK.some((b) => b.id === l.id)).length}.`, '', 'Each law\'s kind (`src/nexus/book/kinds.ts`): fundamental, a definition, derived, constitutive (how a material behaves), empirical (a fit), an approximation (another law in a limit), or geometry.', '', '| Field | In the book | Also a closure and a node | Only in the book | Kinds |', '| --- | --- | --- | --- | --- |');
  const kindsIn = (ls: typeof BOOK) => { const c = new Map<string, number>(); for (const l of ls) { const k = KINDS[l.id]?.[0] ?? '?'; c.set(k, (c.get(k) ?? 0) + 1); } return [...c].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${k}`).join(', '); };
  for (const f of fields) { const ls = BOOK.filter((l) => field.get(l.id) === f); L.push(`| ${f} | ${ls.length} | ${ls.filter((l) => closure.has(l.id) && node.has(l.id)).length} | ${ls.filter((l) => !closure.has(l.id)).length} | ${kindsIn(ls)} |`); }
  L.push(`| all | ${BOOK.length} | | | ${kindsIn(BOOK)} |`);
  for (const f of fields) {
    L.push('', `### ${f}`, '', '| Law | Kind | Variables (symbol: what, unit) | Gives | Engines |', '| --- | --- | --- | --- | --- |');
    for (const l of BOOK.filter((x) => field.get(x.id) === f)) L.push(`| \`${l.id}\` ${l.name} | ${KINDS[l.id]?.[0] ?? '**none**'} | ${l.inputs.map((p) => `${p.sym}: ${p.name}, ${p.unit || '1'}`).join('; ')} | ${l.output.sym}: ${l.output.name}, ${l.output.unit || '1'} | book${closure.has(l.id) ? ', closure' : ''}${node.has(l.id) ? ', node' : ''} |`);
  }
  // ---- quantities shared ----
  const ports = BOOK.flatMap((l) => [...l.inputs, l.output].map((p) => ({ l: l.id, ...p, q: quantityOf(l, p) })));
  const byQ = new Map<string, Set<string>>(); for (const p of ports) if (p.q) (byQ.get(p.q.id) ?? byQ.set(p.q.id, new Set()).get(p.q.id)!).add(p.l);
  const used = QUANTITIES.filter((x) => byQ.has(x.id)).sort((a, b) => byQ.get(b.id)!.size - byQ.get(a.id)!.size);
  L.push('', '## Quantities: what joins the laws', '', `The registry (\`src/nexus/quantities.ts\`) holds ${QUANTITIES.length} quantities; every one of the ${ports.length} ports of the book is one of them (${ports.filter((p) => !p.q).length} are not). ${used.filter((x) => byQ.get(x.id)!.size > 1).length} quantities are shared by two laws or more: those are the joins a chain of laws runs along.`, '', '| Quantity | Unit | Laws |', '| --- | --- | --- |');
  for (const x of used) { const s = byQ.get(x.id)!; L.push(`| ${x.name} | ${x.unit} | ${s.size}: ${[...s].slice(0, 8).map((y) => `\`${y}\``).join(', ')}${s.size > 8 ? ', …' : ''} |`); }
  const bySym = new Map<string, Set<string>>(); for (const p of ports) (bySym.get(p.sym) ?? bySym.set(p.sym, new Set()).get(p.sym)!).add(p.q?.name ?? '?');
  const clashes = [...bySym].filter(([, s]) => s.size > 1).sort((a, b) => b[1].size - a[1].size);
  L.push('', '### One letter, different things', '', `${clashes.length} symbols stand for different quantities in different laws: laws are joined by the quantity, never by the letter.`, '', '| Symbol | Means |', '| --- | --- |');
  for (const [k, s] of clashes) L.push(`| ${k} | ${[...s].join('; ')} |`);
  // ---- material tables and who reads them ----
  const src = files().map((f) => ({ f: relative(root, f), text: readFileSync(f, 'utf8') }));
  L.push('', '## Material tables and the code that reads them', '', '| Table | Defined in | Holds | Read by |', '| --- | --- | --- | --- |');
  for (const t of TABLES) {
    // a file reads the table when it imports one of its names from the very file that defines it
    const reads = (x: { f: string; text: string }) => [...x.text.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g)].some((m) => resolve(dirname(join(root, x.f)), m[2]!) + '.ts' === join(root, t.file) && t.names.some((n) => new RegExp(`(^|[\\s,])${n}(\\s|,|$)`).test(m[1]!)));
    const readers = src.filter((x) => x.f !== t.file && reads(x)).map((x) => `\`${x.f.replace(/^src\//, '')}\``);
    L.push(`| ${t.table} | \`${t.file}\` | ${t.holds} | ${readers.length ? readers.join(', ') : '**nothing**'} |`);
  }
  // ---- numeric ----
  L.push('', '## Where numbers are solved for or stepped in time', '', 'The numeric layer is `src/nexus/numeric.ts`: each answer with its method, whether it converged, its steps and its error.', '', '| What | Where | Through the numeric layer |', '| --- | --- | --- |');
  for (const n of NUMERIC) { const x = src.find((s) => s.f === n.at), found = !!x && n.find.test(x.text); L.push(`| ${n.what} | \`${n.at}\` | ${!found ? '**not found**' : n.stays ? `no: ${n.stays}` : 'yes'} |`); }
  return L.join('\n') + '\n';
}

describe('the dependency map', () => {
  it('is current', () => {
    const want = mapText(), path = join(root, 'docs/DEPENDENCIES.md');
    if (update) writeFileSync(path, want);
    expect(readFileSync(path, 'utf8'), 'out of date: UPDATE_DEPS=1 npx vitest run tests/nexus/dependencies.test.ts').toBe(want);
  });
});
