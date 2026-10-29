// The generated docs, written from the code (not a test): the node catalogue (docs/NODES.md), the atlas (docs/ATLAS.md,
// and the names each node's code reaches, src/nexus/navigate-named.ts), the dependency map (docs/DEPENDENCIES.md, and
// the laws compared with an independent reference, src/nexus/book/compared.ts) and when each node was built
// (src/nexus/built.ts, from git: needs a full clone). Written by `UPDATE_DOCS=1 npx vitest run` (the one test calls
// `writeDocs`; `UPDATE_DOCS=quick` writes only the dates and the catalogue); run it twice where the nodes' code changed (the atlas reads the names the first run wrote).

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import '../../src/nexus/seeds';
import { BOOK, KEPT, KINDS, SLICE, UNIVERSAL } from '../../src/nexus/book';
import { QUANTITIES, quantityOf } from '../../src/nexus/quantities';
import { crossCheck } from '../../src/nexus/lawgraph';
import { FIELDS } from '../../src/nexus/book/fields';
import { MATTER, matterOf } from '../../src/nexus/matter';
import { LIBRARY, libraryCatalogue } from '../../src/nexus/blocks';
import { NAMED_BY, atlasText } from '../../src/nexus/navigate';
import { starterBoards } from '../../src/nexus/starters';

const root = join(__dirname, '../..');
const files = (d = join(root, 'src'), out: string[] = []): string[] => { for (const x of readdirSync(d)) { const p = join(d, x); if (statSync(p).isDirectory()) files(p, out); else if (p.endsWith('.ts')) out.push(p); } return out; };

/** The material tables, where each is defined, and the names others read it by. */
const TABLES: { table: string; file: string; names: string[]; holds: string }[] = [
  { table: 'handbook materials', file: 'src/data/materials.ts', names: ['MATERIALS', 'GROUND_MATERIALS', 'getMaterial', 'FLUIDS'], holds: 'E, ν, yield, ultimate, elongation, conductivity, friction, restitution, colour; source and confidence; ids like steel.a36' },
  { table: 'thermal', file: 'src/engineering/thermal.ts', names: ['thermalOf', 'heatLoss', 'AMBIENT'], holds: 'c, k, emissivity by handbook id' },
  { table: 'fusion', file: 'src/engineering/fusion.ts', names: ['FUSION', 'fusible'], holds: 'melting, expansion, bond, base element by handbook id' },
  { table: 'density', file: 'src/nexus/mass.ts', names: ['DENSITY', 'massOf'], holds: 'density by the ids parts carry (typical)' },
  { table: 'composition', file: 'src/nexus/elements.ts', names: ['makeup', 'elementsOf', 'makeupSays', 'ELEMENTS', 'formula'], holds: 'alloys, formulas, blends down to elements, by the ids parts carry' },
  { table: 'service limit', file: 'src/nexus/make/rules.ts', names: ['MAX_SERVICE'], holds: 'most service temperature, °C, by the ids parts carry' },
  { table: 'the material system', file: 'src/nexus/matter.ts', names: ['matterOf', 'handbookOf', 'MATTER', 'densityOf', 'matterSays'], holds: 'every part material id: its family, what it is exactly or that it is unspecified, its handbook grade (its own, or a stand-in, said); every property with its source and evidence' },
  { table: 'elements', file: 'src/data/periodic.ts', names: ['PERIODIC', 'PERIODIC_SOURCE'], holds: '118 elements: weight, density, melting and boiling points (secondary: compiled from Wikipedia citing CRC and IUPAC)' },
  { table: 'wood species', file: 'src/data/woods.ts', names: ['WOODS', 'woodDensity'], holds: 'species by the Wood Handbook: specific gravity, MOE, MOR at 12 % moisture' },
  { table: 'mixes', file: 'src/data/mixes.ts', names: ['MIXES', 'mixDensity'], holds: 'mixes by what goes into a cubic metre: their density and make-up follow' },
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
  { what: 'a motor run in time', at: 'src/engineering/motorrun.ts', find: /export function runMotor/, stays: 'its steps switch between spin-up and a steady state, with events (overheating, the rise time) and energy counted each step; kept until a stepper with events replaces it whole, its results held by the baseline' },
  { what: 'warming in substeps', at: 'src/engineering/thermal.ts', find: /export function warm/, stays: 'a frame\'s step of a part cooling, its sub-step limited so it never crosses the room\'s temperature: called each frame, not run over a span' },
  { what: 'heat through a grid', at: 'src/nexus/heatflow.ts', find: /export function/, stays: 'a field solver (implicit, Gauss–Seidel over cells), not one equation in time' },
];

function mapText(): string {
  const L: string[] = ['# The dependency map', '', 'Written from the code by `tests/nexus/docs.ts` (step 0 of `docs/REALITY.md`): `UPDATE_DOCS=1 npx vitest run`.', ''];
  // ---- laws ----
  const node = new Set([...LIBRARY.values()].filter((b) => b.kind === 'law').map((b) => b.id.replace(/^law\./, '')));
  const field = new Map<string, string>(); for (const [k, ls] of Object.entries(KEPT)) for (const l of ls) field.set(l.id, k); for (const l of SLICE) field.set(l.id, 'derived (slice)'); for (const l of UNIVERSAL) field.set(l.id, 'universal');
  const fields = [...new Set(field.values())];
  L.push('## Laws and the engines that hold them', '', `${BOOK.length} laws in the book (terms: dimensions checked, domains, derivations); ${node.size} of them nodes, built from the book (step 3: the closures that ran the first 144 are gone). In the book without a node: ${BOOK.filter((l) => !node.has(l.id)).length}.`, '', 'Each law\'s kind (`src/nexus/book/kinds.ts`): fundamental, a definition, derived, constitutive (how a material behaves), empirical (a fit), an approximation (another law in a limit), or geometry.', '', '| Field | In the book | Nodes | Kinds |', '| --- | --- | --- | --- |');
  const kindsIn = (ls: typeof BOOK) => { const c = new Map<string, number>(); for (const l of ls) { const k = KINDS[l.id]?.[0] ?? '?'; c.set(k, (c.get(k) ?? 0) + 1); } return [...c].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${k}`).join(', '); };
  for (const f of fields) { const ls = BOOK.filter((l) => field.get(l.id) === f); L.push(`| ${f} | ${ls.length} | ${ls.filter((l) => node.has(l.id)).length} | ${kindsIn(ls)} |`); }
  L.push(`| all | ${BOOK.length} | ${node.size} | ${kindsIn(BOOK)} |`);
  for (const f of fields) {
    L.push('', `### ${f}`, '', '| Law | Kind | Variables (symbol: what, unit) | Gives | Engines |', '| --- | --- | --- | --- | --- |');
    for (const l of BOOK.filter((x) => field.get(x.id) === f)) L.push(`| \`${l.id}\` ${l.name} | ${KINDS[l.id]?.[0] ?? '**none**'} | ${l.inputs.map((p) => `${p.sym}: ${p.name}, ${p.unit || '1'}`).join('; ')} | ${l.output.sym}: ${l.output.name}, ${l.output.unit || '1'} | book${node.has(l.id) ? ', node' : ''} |`);
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
  // ---- coverage by field ----
  const have = new Set(BOOK.map((l) => l.id));
  for (const f of FIELDS) for (const x of f.laws) if (x.id && !have.has(x.id)) throw new Error(`the coverage map names ${x.id}, not in the book`);
  const all = FIELDS.flatMap((f) => f.laws), got = all.filter((x) => x.id);
  L.push('', '## Coverage: each field\'s core laws, and which the book has', '', `The core of each field as its standard textbook teaches it (\`src/nexus/book/fields.ts\`, each list's source named). ${got.length} of ${all.length} are in the book; the ${all.length - got.length} missing are named with their formulas, to be added from their sources.`, '', '| Field | In the book | Missing |', '| --- | --- | --- |');
  for (const f of FIELDS) { const m = f.laws.filter((x) => !x.id); L.push(`| ${f.field} (${f.from}) | ${f.laws.length - m.length} of ${f.laws.length} | ${m.map((x) => `${x.name} (${x.formula})`).join('; ') || 'none'} |`); }
  // ---- the laws checked against each other ----
  const xc = crossCheck();
  // the laws compared with an independent reference, kept for the evidence each node shows (src/nexus/evidence.ts)
  const compared = `// Written by tests/nexus/docs.ts (UPDATE_DOCS=1): the laws whose worked example the other laws of the book\n// reach another way, and agree with (\`crossCheck\` in lawgraph.ts). Do not edit by hand; when it is stale.\nexport const COMPARED: string[] = [${xc.filter((r) => r.agree).map((r) => `'${r.law}'`).join(', ')}];\n`;
  writeFileSync(join(root, 'src/nexus/book/compared.ts'), compared);
  L.push('', '## The laws checked against each other', '', `Each law's worked example given, its output sought through the other laws alone (\`crossCheck\` in \`src/nexus/lawgraph.ts\`, three laws deep, values joined by name, or by quantity where both the port and the value are named plainly). ${xc.length} of ${BOOK.length} laws have another way to their output; ${xc.filter((r) => r.agree).length} agree to 10⁻⁶; ${xc.filter((r) => !r.agree).length} do not. A disagreement is an approximation against its exact law, a second model of the same thing, or a fault; each is read and said in \`docs/REALITY.md\`.`, '', '| Law | Its example | By the others | Through | |', '| --- | --- | --- | --- | --- |');
  for (const r of xc) L.push(`| \`${r.law}\` | ${+r.own.toPrecision(8)} ${r.unit} | ${+r.other.toPrecision(8)} ${r.unit} | ${r.by.map((b) => `\`${b}\``).join(' → ')} | ${r.agree ? 'agree' : '**differ**'} |`);
  // ---- material tables and who reads them ----
  const src = files().map((f) => ({ f: relative(root, f), text: readFileSync(f, 'utf8') }));
  L.push('', '## Material tables and the code that reads them', '', '| Table | Defined in | Holds | Read by |', '| --- | --- | --- | --- |');
  for (const t of TABLES) {
    // a file reads the table when it imports one of its names from the very file that defines it
    const reads = (x: { f: string; text: string }) => [...x.text.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g)].some((m) => resolve(dirname(join(root, x.f)), m[2]!) + '.ts' === join(root, t.file) && t.names.some((n) => new RegExp(`(^|[\\s,])${n}(\\s|,|$)`).test(m[1]!)));
    const readers = src.filter((x) => x.f !== t.file && reads(x)).map((x) => `\`${x.f.replace(/^src\//, '')}\``);
    L.push(`| ${t.table} | \`${t.file}\` | ${t.holds} | ${readers.length ? readers.join(', ') : '**nothing**'} |`);
  }
  // ---- the materials parts carry ----
  const ms = Object.keys(MATTER).sort().map(matterOf), has = (m: ReturnType<typeof matterOf>, k: string) => m.props.find((p) => p.key === k);
  L.push('', '## The materials parts carry', '', `${ms.length} material ids in the one table (\`MATTER\` in \`src/nexus/matter.ts\`): ${ms.filter((m) => m.specified).length} specified (a grade, a species, a type, a mix), ${ms.filter((m) => !m.specified).length} known only by their family (said unspecified). Handbook grade: ${ms.filter((m) => m.handbook?.same).length} their own, ${ms.filter((m) => m.handbook && !m.handbook.same).length} a stand-in (said), ${ms.filter((m) => !m.handbook).length} none. With a density: ${ms.filter((m) => has(m, 'density')).length}; a strength: ${ms.filter((m) => has(m, 'yield') || has(m, 'ultimate')).length}; a friction: ${ms.filter((m) => has(m, 'friction')).length}; a specific heat: ${ms.filter((m) => has(m, 'c')).length}; a melting point: ${ms.filter((m) => has(m, 'melts')).length}; a make-up down to elements: ${ms.filter((m) => Object.keys(m.makeup.elements).length).length}. Tables that disagree on one property: ${ms.filter((m) => m.disagreements.length).length}.`, '', '| Material | Family | Specified | Handbook grade | Density | Strength | Disagreements |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const m of ms) { const d = has(m, 'density'), st = has(m, 'yield') ?? has(m, 'ultimate'); L.push(`| \`${m.id}\` ${m.is} | ${m.family} | ${m.specified ? 'yes' : '**no**'} | ${m.handbook ? `${m.handbook.name}${m.handbook.same ? '' : ' (stand-in)'}` : '—'} | ${d ? `${+d.value.toPrecision(5)} (${d.evidence})` : '**none**'} | ${st ? `${+(st.value / 1e6).toPrecision(4)} MPa (${st.evidence})` : '—'} | ${m.disagreements.join('; ') || '—'} |`); }
  // ---- numeric ----
  L.push('', '## Where numbers are solved for or stepped in time', '', 'The numeric layer is `src/nexus/numeric.ts`: each answer with its method, whether it converged, its steps and its error.', '', '| What | Where | Through the numeric layer |', '| --- | --- | --- |');
  for (const n of NUMERIC) { const x = src.find((s) => s.f === n.at), found = !!x && n.find.test(x.text); L.push(`| ${n.what} | \`${n.at}\` | ${!found ? '**not found**' : n.stays ? `no: ${n.stays}` : 'yes'} |`); }
  return L.join('\n') + '\n';
}


/** For each library, the nodes whose code in blocks.ts names it. */
function namedText(): string {
  const src = readFileSync(join(root, 'src/nexus/blocks.ts'), 'utf8'), parts = src.split(/\n\s*def\(\{ id: '/).slice(1), named: Record<string, string[]> = {};
  for (const p of parts) { const id = p.slice(0, p.indexOf("'")); if (!LIBRARY.has(id)) continue; for (const [lib, re] of Object.entries(NAMED_BY)) if (re.test(p)) (named[lib] ??= []).push(id); }
  const body = Object.keys(NAMED_BY).filter((k) => named[k]).map((k) => `  ${k}: [${named[k]!.sort().map((x) => `'${x}'`).join(', ')}],`).join('\n');
  return `// Written by tests/nexus/docs.ts (UPDATE_DOCS=1): for each library, the nodes whose code in blocks.ts names it\n// (NAMED_BY in navigate.ts). Do not edit by hand.\nexport const NAMED: Record<string, string[]> = {\n${body}\n};\n`;
}


/** When each node's definition was last changed, from git blame. */
function builtText(): string {
  // each line of every source file with the time of the commit that last changed it (now, for what is not committed)
  const lines: { file: string; text: string; t: string }[] = [];
  for (const f of files(join(root, 'src/nexus')).map((p) => relative(root, p))) {
    let out: string; try { out = execFileSync('git', ['blame', '--line-porcelain', f], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { continue; } // (a file git does not know yet: nothing in it is a node)
    let t = '';
    for (const l of out.split('\n')) { if (l.startsWith('committer-time ')) t = new Date(Number(l.slice(15)) * 1000).toISOString(); else if (l.startsWith('\t')) lines.push({ file: f, text: l.slice(1), t }); }
  }
  const now = new Date().toISOString(), built: Record<string, string> = {}, unfound: string[] = [];
  for (const id of [...LIBRARY.keys()].sort()) {
    const key = id.startsWith('law.') ? id.slice(4) : id, inBook = id.startsWith('law.');
    const written = (k: string, book: boolean) => lines.find((l) => (!book || l.file.includes('/book/')) && (l.text.includes(`id: '${k}'`) || l.text.includes(`id: "${k}"`) || l.text.includes(`save('${k}'`)));
    // (made in a loop: the line that makes it, its id a template on its prefix)
    const prefix = id.slice(0, id.lastIndexOf('.') + 1), looped = () => lines.find((l) => l.text.includes(`id: \`${prefix}\${`) || l.text.includes(`save(\`${prefix}\${`));
    const hit = (inBook ? written(key, true) : undefined) ?? written(id, false) ?? (prefix ? looped() : undefined);
    if (hit) built[id] = hit.t || now; else unfound.push(id);
  }
  // each starter board (a build): the latest change to any line of it, from its title to the next board's
  const st = lines.filter((l) => l.file.endsWith('src/nexus/starters.ts')), starts = st.map((l, k) => (/^\s*\['/.test(l.text) ? k : -1)).filter((k) => k >= 0), boards: Record<string, string> = {};
  for (const [title] of starterBoards()) {
    const k = starts.find((j) => st[j]!.text.replace(/\\'/g, "'").includes(title.slice(0, 60))); if (k === undefined) continue;
    const end = starts.find((j) => j > k) ?? st.length; let t = '';
    for (let j = k; j < end; j++) { const tj = st[j]!.t || now; if (tj > t) t = tj; }
    boards[title] = t;
  }
  return (`// Generated by tests/nexus/docs.ts (UPDATE_DOCS=1): when each node's definition was last changed, from git.\n// A node built before the update is said to be on the node: its tests may be flawed, and it is not yet re-checked\n// against what the update brought (laws with units, evidence, ±, materials down to their elements).\n\n/** The update: Reality step 0 (docs/REALITY.md), commit 269af04. */\nexport const UPDATE = '2026-10-28T06:21:22.000Z';\n/** Each node's id, and when it was built or last rebuilt. */\nexport const BUILT: Record<string, string> = ${JSON.stringify(built, null, 0).replace(/","/g, '",\n  "').replace('{"', '{\n  "').replace('"}', '"\n}')};\n/** Nodes whose definition could not be found written out (made in a loop): dated by nothing, so said as before the update. */\nexport const UNDATED: string[] = ${JSON.stringify(unfound)};\n/** Each starter board (a build), and when any of it was last changed: one made before the update, and not rebuilt since, is\n *  said to be from before it (its parts and its answers not yet re-worked through the contact graph, the frame and the\n *  laws with units). */\nexport const BOARDS_BUILT: Record<string, string> = ${JSON.stringify(boards, null, 0).replace(/","/g, '",\n  "').replace('{"', '{\n  "').replace('"}', '"\n}')};\n`);
}

/** Writes every generated doc; `quick`, only the nodes' dates and the catalogue (seconds, not the minute and more the
 *  dependency map's cross-check of every law takes). */
export function writeDocs(quick = false): void {
  writeFileSync(join(root, 'src/nexus/built.ts'), builtText());
  writeFileSync(join(root, 'docs/NODES.md'), libraryCatalogue() + '\n');
  if (quick) return;
  writeFileSync(join(root, 'src/nexus/navigate-named.ts'), namedText());
  writeFileSync(join(root, 'docs/ATLAS.md'), atlasText());
  writeFileSync(join(root, 'docs/DEPENDENCIES.md'), mapText());
}
