// Navigation: everything the nexus holds, in one place, so it can be reached when it is needed, and shown when you did
// not know you needed it. Every library (the nodes, the flows built from them, the products, parts, matter, bodies and
// knowledge they draw on), by its type, with how many it holds and which nodes reach it (read from the nodes' own
// setting choices, not declared); how each node's work flows (once, with the clock, played back, many at a time, to a
// fixed point, on an event, shown); every starter flow and what it uses; and, for any node, what could come after it and
// before it (by what its ports carry and by how the flows already wire it), and for any board, what it may be missing (by
// the stages of the work it does not reach yet). docs/ATLAS.md is this, written out; a test keeps it current.

import { LIBRARY, STAGES, clockOf, defaultsOf, portsOf, stageOf, type BlockDef, type Type } from './blocks';
import { INVENTORY } from './inventory';
import { FAMILIES } from './families';
import { DESIGNED } from './components';
import { catalogue } from './catalogue';
import { DISCIPLINE } from '../data/disciplines';
import { MATERIALS, GROUND_MATERIALS } from '../data/materials';
import { BCI_GROUPS } from '../data/batteries';
import { MOTORS, GEARHEADS } from '../data/motors';
import { MACHINES } from './machines';
import { POWERTRAINS } from './power/drive';
import { SUBSTANCES } from './aware/gas';
import { ACTORS } from './aware/tags';
import { SECTIONS } from './placement/line';
import { STANDARD } from './mate';
import { REFERENCE_NOTES } from './research';
import { PROGRAMS } from './logic/programs';
import { starterBoards } from './starters';
import { searchCatalogue } from './catalogue';
import { NAMED } from './navigate-named';
import { stocked } from './stock';
import './reconstruct';
import type { Board, BoardNode, BoardEdge } from './boards';

const nodesIn = (b: Board): (BoardNode & { id: string })[] => Object.entries(b.nodes).filter(([, n]) => !n.deleted && n.block).map(([id, n]) => ({ ...n, id }));
const wiresIn = (b: Board): BoardEdge[] => Object.values(b.edges).filter((e) => !e.deleted && e.out && e.in);

export interface Entry { library: string; id: string; name: string; says: string }
export interface Library { id: string; name: string; type: string; says: string; count: number; entries: () => Entry[]; /** nodes that reach it, and how: a setting of theirs chooses among its entries (found), or their code names it (named, read by tests/nexus/docs.ts into navigate-named.ts) */ reach: { node: string; key?: string; how: 'found' | 'named' | 'all' }[]; source: string; /** where a node reaches only some of it, how much */ partly?: string }

/** What in a node's code names each library (read from blocks.ts by the test that writes navigate-named.ts). */
export const NAMED_BY: Record<string, RegExp> = {
  machines: /\bMACHINES\b|\bmachineOf\(|\bmakeMachine\(/, powertrains: /\bPOWERTRAINS\b/, inventory: /\bINVENTORY\b|\bitemOf\(|\bfindItem\(|\bfeed\(feedLinesOf/,
  components: /\bDESIGNED\b|\bcomponent\(|\bcomponentFromParams\(|\buse\(/, families: /\bFAMILIES\b|\bfamilyOf\(|\bcallFamily\(/, catalogue: /\bcatalogue\(|\bcatalogueItem\(/,
  faces: /\bSTANDARD\b/, sections: /\bSECTIONS\b|\bsectionOf\(/, bci: /\bBCI_GROUPS\b|\bstarterBattery\(/, motors: /\bMOTORS\b/, gearheads: /\bGEARHEADS\b/,
  materials: /\bMATERIALS\b|\bgetMaterial\(/, gases: /\bSUBSTANCES\b|\breleasesOf\(|\beffectsOf\(/, actors: /\bACTORS\b/, references: /\bREFERENCE_NOTES\b|\breferenceOf\(/, programs: /\bPROGRAMS\b/,
};

/** The kinds of library, in the order a build reaches for them. */
export const LIBRARY_TYPES: { id: string; name: string; says: string }[] = [
  { id: 'nodes', name: 'Nodes', says: 'what a board is built from: the node library, its laws, its seeds (nodes built from nodes)' },
  { id: 'flows', name: 'Flows', says: 'boards: whole pipelines of nodes to start from, and yours' },
  { id: 'products', name: 'Products', says: 'real things by their makers\' figures: machines, powertrains, the inventory of what things contain' },
  { id: 'parts', name: 'Parts', says: 'what builds are made of, by standard: designed components, families sized by their tables, catalogue sizes, faces, sections, cells, motors' },
  { id: 'matter', name: 'Matter', says: 'what things are made of and give off: materials, gases' },
  { id: 'bodies', name: 'Bodies', says: 'who acts and senses: the actors\' bodies' },
  { id: 'knowledge', name: 'Knowledge', says: 'what is known and run: researched references, programs' },
];

const rec = <T>(o: Record<string, T>, name: (k: string, v: T) => string, says: (k: string, v: T) => string, library: string): Entry[] => Object.entries(o).map(([k, v]) => ({ library, id: k, name: name(k, v), says: says(k, v) }));
const lab = (v: unknown) => (v && typeof v === 'object' && 'label' in v ? String((v as { label: string }).label) : '');
const boards = () => starterBoards();

/** Every library, each with what reaches it. */
export function libraries(): Library[] {
  const blocks = [...LIBRARY.values()].filter((b) => !b.id.startsWith('group.'));
  const L: Omit<Library, 'reach' | 'count'>[] = [
    { id: 'nodes', name: 'Node library', type: 'nodes', says: 'every node, on its shelf by stage (docs/NODES.md)', source: 'src/nexus/blocks.ts', entries: () => blocks.filter((b) => b.kind !== 'law' && !b.id.startsWith('seed.')).map((b) => ({ library: 'nodes', id: b.id, name: b.name, says: specified(b) })) },
    { id: 'laws', name: 'Laws', type: 'nodes', says: 'every physical law as a calculator', source: 'src/nexus/law.ts', entries: () => blocks.filter((b) => b.kind === 'law').map((b) => ({ library: 'laws', id: b.id, name: b.name, says: b.says })) },
    { id: 'seeds', name: 'Seeds', type: 'nodes', says: 'things built from nodes, kept as one node each (a door, a room, a house, a city)', source: 'src/nexus/seeds.ts', entries: () => blocks.filter((b) => b.id.startsWith('seed.')).map((b) => ({ library: 'seeds', id: b.id, name: b.name, says: b.says })) },
    { id: 'boards', name: 'Starter boards', type: 'flows', says: 'whole pipelines across fields, to open and change', source: 'src/nexus/starters.ts', entries: () => boards().map(([t]) => ({ library: 'boards', id: t, name: t.split(':')[0]!, says: t })) },
    { id: 'machines', name: 'Machines', type: 'products', says: 'real models by their makers\' published figures', source: 'src/nexus/machines.ts', entries: () => MACHINES.map((m) => ({ library: 'machines', id: m.short ?? m.id, name: m.name, says: m.source })) },
    { id: 'powertrains', name: 'Powertrains', type: 'products', says: 'what is known to run a machine by name: compression, gearbox, final drive, drag', source: 'src/nexus/power/drive.ts', entries: () => rec(POWERTRAINS, (k) => `${MACHINES.find((m) => m.short === k)?.name ?? k}: its powertrain`, (_k, v) => v.source, 'powertrains') },
    { id: 'inventory', name: 'Inventory', type: 'products', says: 'what real products contain, all the way down to their materials', source: 'src/nexus/inventory.ts', entries: () => [...INVENTORY.values()].map((it) => ({ library: 'inventory', id: it.id, name: it.name, says: it.says })) },
    { id: 'components', name: 'Designed components', type: 'parts', says: 'parts drawn once in 3D from their standard, used by every build', source: 'src/nexus/components.ts', entries: () => DESIGNED.map((d) => ({ library: 'components', id: d, name: d, says: `use("${d} …")` })) },
    { id: 'families', name: 'Part families', type: 'parts', says: 'kinds of part made to any size by their standard\'s table', source: 'src/nexus/families.ts', entries: () => FAMILIES.map((f) => ({ library: 'families', id: f.id, name: f.name, says: f.says })) },
    { id: 'stock', name: 'Built parts', type: 'parts', says: 'every piece every build makes, at every depth, stored once by its design: a build takes its pieces from here or stores the new ones here', source: 'src/data/stock.json', entries: () => [...stocked().values()].map((s) => ({ library: 'stock', id: s.key, name: s.name, says: `${s.kids.length ? `${s.kids.reduce((a, [, n]) => a + n, 0)} pieces in it; ` : ''}used by ${s.usedBy.length} build${s.usedBy.length === 1 ? '' : 's'} (${s.usedBy.slice(0, 3).map((u) => u.replace(/#.*/, '')).join(', ')}${s.usedBy.length > 3 ? ', …' : ''})` })) },
    { id: 'catalogue', name: 'Catalogue sizes', type: 'parts', says: 'every standard size of every family', source: 'src/nexus/catalogue.ts', entries: () => catalogue().map((l) => ({ library: 'catalogue', id: l, name: l, says: '' })) },
    { id: 'faces', name: 'Standard faces', type: 'parts', says: 'hole patterns parts mate by (NEMA motor faces, ISO 9409 flanges, bolt circles)', source: 'src/nexus/mate.ts', entries: () => rec(STANDARD, (k) => k, (_k, v) => v.says, 'faces') },
    { id: 'sections', name: 'Line sections', type: 'parts', says: 'what a line is across: wires, cables, hoses, pipes, traces, roads', source: 'src/nexus/placement/line.ts', entries: () => SECTIONS.map((x) => ({ library: 'sections', id: x.id, name: x.name, says: x.source })) },
    { id: 'bci', name: 'BCI battery groups', type: 'parts', says: 'starting batteries by their group\'s case', source: 'src/data/batteries.ts', entries: () => rec(BCI_GROUPS, (k) => `group ${k}`, () => '', 'bci') },
    { id: 'motors', name: 'Motors', type: 'parts', says: 'DC motors by their datasheets', source: 'src/data/motors.ts', entries: () => rec(MOTORS, (k, v) => lab(v) || k, () => '', 'motors') },
    { id: 'gearheads', name: 'Gearheads', type: 'parts', says: 'gearheads by their datasheets', source: 'src/data/motors.ts', entries: () => rec(GEARHEADS, (k, v) => lab(v) || k, () => '', 'gearheads') },
    { id: 'materials', name: 'Materials', type: 'matter', says: 'what things are made of, each property sourced', source: 'src/data/materials.ts', entries: () => [...MATERIALS, ...GROUND_MATERIALS].map((m) => ({ library: 'materials', id: m.id, name: m.name, says: m.category })) },
    { id: 'gases', name: 'Gases', type: 'matter', says: 'substances given off, with what they do at each concentration', source: 'src/nexus/aware/gas.ts', entries: () => rec(SUBSTANCES, (_k, v) => v.name, () => '', 'gases') },
    { id: 'actors', name: 'Actors', type: 'bodies', says: 'bodies that act and sense (an adult, a child), by their proportions', source: 'src/nexus/aware/tags.ts', entries: () => rec(ACTORS, (_k, v) => v.name, (_k, v) => `${v.height} m, ${v.mass} kg`, 'actors') },
    { id: 'references', name: 'References', type: 'knowledge', says: 'researched things, compiled from sourced notes', source: 'src/nexus/research.ts', entries: () => rec(REFERENCE_NOTES, (_k, v) => v.name, () => '', 'references') },
    { id: 'programs', name: 'Programs', type: 'knowledge', says: 'programs for the chips that run here', source: 'src/nexus/logic/programs.ts', entries: () => rec(PROGRAMS, (k) => k, (_k, v) => v.says, 'programs') },
  ];
  // (the node library and the boards are reached by the library panel itself)
  const SAID: Record<string, string[]> = { nodes: ['*'], laws: ['*'], seeds: ['*'], boards: ['*'] };
  // (a setting reaches the library, or libraries, whose entries most of its choices are: at least half of them, and two)
  const idsOf = new Map(L.map((l) => [l.id, new Set(l.entries().map((e) => e.id))])), found = new Map<string, Library['reach']>();
  for (const b of blocks) for (const s of b.settings ?? []) {
    const ch = (s.choices ?? []).map(String); if (ch.length < 2) continue;
    const shares = [...idsOf].filter(([id]) => !SAID[id]?.includes('*')).map(([id, ids]) => [id, ch.filter((c) => ids.has(c)).length / ch.length] as const), top = Math.max(...shares.map(([, x]) => x));
    const hits = (id: string) => ch.filter((c) => idsOf.get(id)!.has(c)).length;
    if (top >= 0.5) for (const [id, x] of shares) if (x === top && hits(id) >= 2) found.set(id, [...(found.get(id) ?? []), { node: b.id, key: s.key, how: 'found' }]);
  }
  // (the catalogue's sizes go into the Part node by their words; it draws those of the kinds designed in 3D, the rest are known by name and size)
  const drawn = (line: string) => DESIGNED.includes(line.split(' ')[0]!), lines = idsOf.get('catalogue')!, nDrawn = [...lines].filter(drawn).length;
  found.set('catalogue', [{ node: 'card.part', key: 'what', how: 'found' }]);
  return L.map((l) => {
    const reach = [...(found.get(l.id) ?? [])];
    if (l.id === 'stock') return { ...l, count: idsOf.get(l.id)!.size, reach: [{ node: 'stock.part', key: 'id', how: 'found' }] };
    if (l.id === 'catalogue') return { ...l, count: lines.size, reach, partly: `${nDrawn.toLocaleString('en-US')} of its ${lines.size.toLocaleString('en-US')} sizes, those of the ${DESIGNED.length} kinds drawn in 3D; the rest are known by name and size and not drawn yet` };
    for (const n of NAMED[l.id] ?? []) if (LIBRARY.has(n) && !reach.some((r) => r.node === n)) reach.push({ node: n, how: 'named' });
    return { ...l, count: idsOf.get(l.id)!.size, reach: SAID[l.id]?.includes('*') ? [{ node: '*', how: 'all' }] : reach };
  });
}

/** One thing found by a search, with what to place to use it (a node, set to it) or the board to open. */
export interface Found { library: string; libraryName: string; id: string; name: string; says: string; add?: { block: string; set?: Record<string, unknown> }; board?: string; score: number }
let libsKept: Library[] | null = null;
const entriesKept = new Map<string, Entry[]>();
/** Every library, worked out once. */
export const allLibraries = (): Library[] => (libsKept ??= libraries());
const entriesOf = (l: Library): Entry[] => { let e = entriesKept.get(l.id); if (!e) { e = l.entries(); entriesKept.set(l.id, e); } return e; };
/** What uses an entry of a library: the node to put on the board, set to it (a node of the library itself; the node whose
 *  setting chooses among the entries; one whose code names the library; the inventory read as it is), or the board to open. */
export function useOf(l: Library, e: Entry): Pick<Found, 'add' | 'board'> {
  if (l.type === 'nodes') return { add: { block: e.id } };
  if (l.id === 'boards') return { board: e.id };
  if (l.id === 'inventory') return { add: { block: 'read', set: { id: `item:${e.id}`, kind: 'item' } } };
  if (l.id === 'stock') return { add: { block: 'stock.part', set: { id: e.id } } };
  if (l.id === 'catalogue') return DESIGNED.includes(e.id.split(' ')[0]!) ? { add: { block: 'card.part', set: { what: e.id } } } : {};
  const via = l.reach.find((r) => r.how === 'found' && r.key) ?? l.reach.find((r) => r.how === 'named');
  return via && via.node !== '*' ? { add: { block: via.node, ...(via.key ? { set: { [via.key]: e.id } } : {}) } } : {};
}
/** Words looked for through everything: every node, law, seed and starter board, every product, part, material, body,
 *  reference and program, and the catalogue's sizes; the best first (the whole name, then its start, then a word in it,
 *  then what it says). Each with the node that uses it, set to it, where one does. */
/** What a node says, with its specification where it has one: its plain gloss, its discipline and its codes, so a search
 *  by either the technical term or the plain question finds it. */
const specified = (b: BlockDef): string => (b.spec ? `${b.spec.gloss}. ${b.says} ${DISCIPLINE.get(b.spec.discipline)?.name ?? ''} ${b.spec.codes.map((c) => `${c.code} ${c.label}`).join(' ')}` : b.says);
/** Words a person searches by that the library says another way: each also finds what its others name. */
const ALSO: Record<string, string[]> = { collision: ['interference', 'runs into', 'clash'], collide: ['interference', 'runs into'], clash: ['interference', 'runs into'], cad: ['solid', 'b-rep', 'step'], fea: ['calculix', 'three ways'], 'finite': ['calculix'], optimise: ['fit to a target', 'pareto'], optimize: ['fit to a target', 'pareto'], sensitivity: ['what matters'], ai: ['vision model', 'image model', 'intelligence'] };
export function search(q: string, most = 40): Found[] {
  const ws = q.toLowerCase().split(/\s+/).filter(Boolean); if (!ws.length) return [];
  const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), forms = (w: string) => [w, ...(ALSO[w] ?? [])];
  const out: Found[] = [], rank = (name: string, says: string, id: string): number => {
    const n = name.toLowerCase(), all = `${n} ${id.toLowerCase()} ${says.toLowerCase()}`; if (!ws.every((w) => forms(w).some((f) => all.includes(f)))) return 0;
    // (the name itself, then starting with it, then each word whole in it ("STEP" for step, over "stepper"), then each
    // word starting one, then inside one; found by another word for it, a little under)
    const whole = ws.join(' '), inName = (re: (w: string) => RegExp) => ws.every((w) => forms(w).some((f) => re(f).test(n)));
    return n === whole ? 100 : n.startsWith(whole) ? 60 : inName((w) => new RegExp(`\\b${esc(w)}\\b`)) ? 45 : inName((w) => new RegExp(`\\b${esc(w)}`)) ? 40 : ws.every((w) => n.includes(w)) ? 25 : ws.every((w) => all.includes(w)) ? 5 : 4;
  };
  for (const l of allLibraries()) {
    if (l.id === 'catalogue') continue;
    for (const e of entriesOf(l)) { const r = rank(e.name, e.says, e.id); if (!r) continue;
      const f: Found = { library: l.id, libraryName: l.name, id: e.id, name: e.name, says: e.says, score: r + (l.type === 'nodes' ? 3 : 0) };
      out.push({ ...f, ...useOf(l, e) }); } }
  for (const line of searchCatalogue(q, 10)) { const d = DESIGNED.includes(line.split(' ')[0]!); out.push({ library: 'catalogue', libraryName: 'Catalogue sizes', id: line, name: line, says: d ? 'a standard size, drawn whole' : 'a standard size, known and not drawn yet', score: 4, ...(d ? { add: { block: 'card.part', set: { what: line } } } : {}) }); }
  return out.sort((a, b) => b.score - a.score || a.name.length - b.name.length).slice(0, most);
}

/** How a node's work flows. */
export const FLOWS: { id: string; name: string; says: string }[] = [
  { id: 'once', name: 'Worked once', says: 'from its inputs, again only when they change (most nodes)' },
  { id: 'clock', name: 'With the clock', says: 'again as the board\'s time goes on' },
  { id: 'played', name: 'Worked once, played by the clock', says: 'a simulation run once and posed at any time' },
  { id: 'many', name: 'Many at once', says: 'one thing for each row or point: spawned, scattered, patterned' },
  { id: 'loop', name: 'To a fixed point', says: 'rounds until nothing more changes: repairs, research, gauntlets' },
  { id: 'event', name: 'On an event', says: 'when something happens' },
  { id: 'fetch', name: 'From outside', says: 'fetched or run elsewhere (a source online, a worker, Claude)' },
  { id: 'shown', name: 'Shown', says: 'an end of a flow: a table, a value, a chart, the space' },
];
export function flowOf(b: BlockDef): string {
  const ins = portsOf(b, defaultsOf(b)).inputs;
  if (b.kind === 'trigger' || /^on\./.test(b.id)) return 'event';
  if (b.kind === 'view' || b.sink) return 'shown';
  if (b.kind === 'code' || b.kind === 'ai' || /^(netlist|search\.web)$/.test(b.id)) return 'fetch';
  if (/(\.loop|^gauntlet\.run|^repair)/.test(b.id)) return 'loop';
  if (/^(spawn|scatter|array|seed\.(neighbourhood|city|roads))$/.test(b.id)) return 'many';
  if (clockOf(b)) return 'clock';
  if (b.ability === 'simulate' && ins.some((p) => p.name === 't')) return 'played';
  return 'once';
}

// ---- discovery: what goes with what -------------------------------------------------------------------------------------
let wiredKept: Map<string, number> | null = null, usedKept: Map<string, string[]> | null = null;
/** How the starter flows wire one node into another (from → to, how many times), and where each node is used. */
export function usage(): { wired: Map<string, number>; used: Map<string, string[]> } {
  if (wiredKept && usedKept) return { wired: wiredKept, used: usedKept };
  const wired = new Map<string, number>(), used = new Map<string, string[]>();
  for (const [title, mk] of boards()) { const b = mk(); const blockOf = (id: string) => b.nodes[id]?.block ?? '';
    for (const n of nodesIn(b)) { const k = n.block; if (k) { const u = used.get(k) ?? []; if (!u.includes(title)) u.push(title); used.set(k, u); } }
    for (const e of wiresIn(b)) { const f = blockOf(e.from), t = blockOf(e.to); if (f && t) wired.set(`${f}>${t}`, (wired.get(`${f}>${t}`) ?? 0) + 1); } }
  wiredKept = wired; usedKept = used; return { wired, used };
}
const fits = (out: Type, into: Type) => out === into || into === 'any' || (out === 'part' && into === 'assembly') || (out === 'assembly' && into === 'part') || (into.startsWith('list<') && out.startsWith('list<')) || (out === 'integer' && into === 'number');
export interface Neighbour { id: string; name: string; why: string; score: number }
/** What could come after a node and before it: what the flows already wire to it first, then what takes a thing it
 *  gives (a part, a table, a record over a bare number), in the stages of the work after it (or before), its fields
 *  shared. */
export function nextFor(id: string, most = 8): { after: Neighbour[]; before: Neighbour[]; usedIn: string[] } {
  const me = LIBRARY.get(id); if (!me) return { after: [], before: [], usedIn: [] };
  const { wired, used } = usage(), mine = portsOf(me, defaultsOf(me)), st = STAGES.findIndex((s) => s.id === stageOf(me));
  const rich = (t: Type) => !/^(number|integer|text|boolean|any)$/.test(t);
  const score = (other: BlockDef, outs: Type[], ins: Type[], dir: 'after' | 'before'): Neighbour | null => {
    const pairs = outs.flatMap((o) => ins.filter((i) => fits(o, i)).map((i) => [o, i] as const));
    const w = wired.get(dir === 'after' ? `${id}>${other.id}` : `${other.id}>${id}`) ?? 0, specific = pairs.some(([o, i]) => o === i && rich(i)), plain = pairs.some(([o, i]) => o === i);
    if (!w && !plain) return null;
    const so = STAGES.findIndex((s) => s.id === stageOf(other));
    const s = w * 10 + (specific ? 4 : plain ? 1 : 0) + (other.domains.some((d) => me.domains.includes(d)) ? 1 : 0) + ((dir === 'after' ? so >= st : so <= st) ? 1 : 0) - (other.kind === 'law' ? 2 : 0);
    const [o, i] = pairs.find(([x, y]) => x === y && rich(x)) ?? pairs.find(([x, y]) => x === y) ?? pairs[0] ?? ['any', 'any'];
    return { id: other.id, name: other.name, score: s, why: w ? `wired so in ${w} flow${w > 1 ? 's' : ''}` : `takes the ${o} it gives${i !== o ? ` (as ${i})` : ''}` };
  };
  const all = [...LIBRARY.values()].filter((b) => b.id !== id && !b.id.startsWith('group.') && !b.alias);
  const pick = (xs: (Neighbour | null)[]) => xs.filter((x): x is Neighbour => !!x).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, most);
  return {
    after: pick(all.map((b) => score(b, mine.outputs.map((p) => p.type), portsOf(b, defaultsOf(b)).inputs.map((p) => p.type), 'after'))),
    before: pick(all.map((b) => score(b, portsOf(b, defaultsOf(b)).outputs.map((p) => p.type), mine.inputs.map((p) => p.type), 'before'))),
    usedIn: used.get(id) ?? [],
  };
}
export interface Need { stage: string; why: string; nodes: string[]; /** the node on the board it is about: one of `nodes` goes after it (takes what it gives) or before it */ at?: { after?: string; before?: string } }
/** What a board may be missing, by the work it does: a thing made and never checked, never shown; a time it plays with
 *  no clock; zones and mates put on and never kept; numbers worked out and never shown. Read from its nodes' stages and
 *  what their ports carry, never from what the board is about. */
export function needsOf(b: Board): Need[] {
  const blocks = nodesIn(b).map((n) => ({ n, d: LIBRARY.get(n.block!) })).filter((x): x is { n: BoardNode & { id: string }; d: BlockDef } => !!x.d);
  const stages = new Set(blocks.map((x) => stageOf(x.d))), ids = new Set(blocks.map((x) => x.d.id)), out: Need[] = [];
  const edges = wiresIn(b), fed = (nid: string, port: string) => edges.some((e) => e.to === nid && e.in === port);
  const thing = (t: Type) => t === 'part' || t === 'assembly' || t === 'list<part>' || t === 'list<assembly>';
  const makesThing = blocks.some((x) => portsOf(x.d, defaultsOf(x.d)).outputs.some((p) => thing(p.type)));
  // (things the board itself puts where they go, so they may run into one another: two or more placed by hand into one
  //  assembly, or a pattern of them; things a seed or a maker lays out are laid out by its own rules)
  const placedInto = (to: string) => edges.filter((e) => e.to === to && b.nodes[e.from]?.block === 'place').length;
  const together = blocks.some((x) => placedInto(x.n.id) >= 2 || /^(array|mirror|scatter)$/.test(x.d.id));
  // (the thing the board ends with: what it shows, else a thing made that nothing takes further)
  const givesThing = (x: (typeof blocks)[number]) => portsOf(x.d, { ...defaultsOf(x.d), ...(x.n.set ?? {}) }).outputs.some((p) => thing(p.type));
  const shownFrom = edges.find((e) => /^(space\.show|view\.3d)$/.test(b.nodes[e.to]?.block ?? ''))?.from;
  const last = shownFrom ?? blocks.filter((x) => givesThing(x) && !edges.some((e) => e.from === x.n.id && blocks.some((y) => y.n.id === e.to && givesThing(y)))).at(-1)?.n.id;
  if (together && !stages.has('check')) out.push({ stage: 'check', why: 'it places things itself and never checks whether they run into each other or keep their room', nodes: ['clash', 'check.rules', 'proximity'].filter((x) => LIBRARY.has(x)), ...(last ? { at: { after: last } } : {}) });
  if (makesThing && !ids.has('space.show') && !ids.has('view.3d')) out.push({ stage: 'show', why: 'it makes things and never shows them', nodes: ['space.show', 'view.3d'], ...(last ? { at: { after: last } } : {}) });
  if ([...ids].some((x) => x === 'zone' || x === 'relate') && !ids.has('proximity')) out.push({ stage: 'mate', why: 'zones or mates are put on, and nothing keeps them', nodes: ['proximity', 'mates'], ...(last ? { at: { after: last } } : {}) });
  const unclocked = blocks.find((x) => portsOf(x.d, defaultsOf(x.d)).inputs.some((p) => p.name === 't') && !fed(x.n.id, 't'));
  if (unclocked && !ids.has('time')) out.push({ stage: 'run', why: 'it has what plays with time, and no clock', nodes: ['time'], at: { before: unclocked.n.id } });
  const figures = blocks.filter((x) => portsOf(x.d, defaultsOf(x.d)).outputs.some((p) => p.type === 'table' || p.type === 'number')), loose = figures.find((x) => !edges.some((e) => e.from === x.n.id)) ?? figures.at(-1);
  if (!stages.has('show') && loose) out.push({ stage: 'show', why: 'it works out numbers and tables and shows none', nodes: ['view.table', 'view.show', 'view.chart'], at: { after: loose.n.id } });
  return out;
}

/** A board's field, read from its nodes: the field its nodes vote for ("everyday" or "math" only where nothing else is),
 *  a tie to the field fewer nodes in the library share (the more particular). Never filed by hand. */
export function fieldOf(b: Board): string {
  const tally = new Map<string, number>(), lib = new Map<string, number>();
  for (const d of LIBRARY.values()) for (const f of d.domains) lib.set(f, (lib.get(f) ?? 0) + 1);
  // (each node one vote, split over its fields, so a node of every field says little; its inputs, tables and views a
  //  quarter of one, as every board has them)
  const ds = nodesIn(b).map((n) => LIBRARY.get(n.block!)).filter((d): d is BlockDef => !!d);
  for (const d of ds) { const fs = d.domains.filter((f) => f !== 'everyday' && f !== 'math'), w = (/^(start|data|show|board)$/.test(stageOf(d)) ? 0.25 : 1) / Math.max(1, fs.length); for (const f of fs) tally.set(f, (tally.get(f) ?? 0) + w); }
  const best = [...tally].sort((x, y) => y[1] - x[1] || (lib.get(x[0]) ?? 0) - (lib.get(y[0]) ?? 0))[0];
  return best?.[0] ?? (ds.some((d) => d.domains.includes('math')) ? 'math' : 'everyday');
}
/** What reaches a library, in words: the panel; nodes by a setting (many by the same one said together); nodes whose code names it. */
export function reachText(l: Library): string {
  if (!l.reach.length) return '**no node reaches it yet**';
  if (l.reach.some((r) => r.node === '*')) return 'the library panel';
  const byKey = new Map<string, string[]>(), named: string[] = [];
  for (const r of l.reach) if (r.key) byKey.set(r.key, [...(byKey.get(r.key) ?? []), r.node]); else named.push(r.node);
  const parts = [...byKey].map(([k, ns]) => (ns.length > 3 ? `the ${k} of ${ns.length} nodes (${ns.slice(0, 3).map((n) => `\`${n}\``).join(', ')}, …)` : ns.map((n) => `\`${n}\` (its ${k})`).join(', ')));
  if (named.length) parts.push(`${named.map((n) => `\`${n}\``).join(', ')} (in ${named.length > 1 ? 'their' : 'its'} code)`);
  return parts.join('; ') + (l.partly ? `: ${l.partly}` : '');
}
/** The atlas written out (docs/ATLAS.md). */
export function atlasText(): string {
  const libs = allLibraries(), lines = ['# The atlas', '', 'Everything the nexus holds, in one place: generated by `atlasText()` in `src/nexus/navigate.ts`; `tests/nexus/docs.ts` fails if it is out of date (write it again with `UPDATE_ATLAS=1 npx vitest run tests/nexus/docs.ts`). In the app, the library\'s search reaches all of it, and each node shows what could come after and before it.', ''];
  lines.push('## Libraries, by type', '');
  for (const t of LIBRARY_TYPES) { const ls = libs.filter((l) => l.type === t.id); if (!ls.length) continue; lines.push(`### ${t.name}`, '', `${t.says[0]!.toUpperCase()}${t.says.slice(1)}.`, '', '| Library | Holds | Reached by | Source |', '| --- | --- | --- | --- |');
    for (const l of ls) lines.push(`| ${l.name} | ${l.count.toLocaleString('en-US')} | ${reachText(l)} | \`${l.source}\` |`);
    lines.push(''); }
  const unreached = libs.filter((l) => !l.reach.length); if (unreached.length) lines.push(`Not reached by any node yet: ${unreached.map((l) => l.name).join(', ')}. Each is a node to make, or a setting to give one.`, '');
  const blocks = [...LIBRARY.values()].filter((b) => !b.id.startsWith('group.')), byFlow = new Map<string, string[]>(); for (const b of blocks) { const f = flowOf(b); byFlow.set(f, [...(byFlow.get(f) ?? []), b.name]); }
  lines.push('## How each node\'s work flows', '', '| Flow | Nodes | Which |', '| --- | --- | --- |');
  for (const f of FLOWS) { const ns = (byFlow.get(f.id) ?? []).sort(); lines.push(`| ${f.name}: ${f.says} | ${ns.length} | ${f.id === 'once' ? 'the rest' : ns.join(', ')} |`); }
  lines.push('', '## Flows to start from', '', '| Board | Field | Nodes | Stages it reaches | May be missing |', '| --- | --- | --- | --- | --- |');
  for (const [title, mk] of boards()) { const b = mk(), ns = nodesIn(b).map((n) => LIBRARY.get(n.block!)).filter((d): d is BlockDef => !!d), st = new Set(ns.map(stageOf)), field = fieldOf(b);
    lines.push(`| ${title.length > 70 ? `${title.slice(0, 68)}…` : title} | ${field} | ${ns.length} | ${STAGES.filter((s) => st.has(s.id)).map((s) => s.name.split(' · ')[0]).join(' ')} | ${needsOf(b).map((x) => x.why).join('; ') || '·'} |`); }
  const { used } = usage(), never = blocks.filter((b) => b.kind !== 'law' && !used.has(b.id) && !b.id.startsWith('seed.fittings.')).map((b) => b.name).sort();
  lines.push('', '## Nodes no starter board uses yet', '', `${never.length} of ${blocks.filter((b) => b.kind !== 'law').length} (laws aside): ${never.join(', ')}.`, '');
  return lines.join('\n');
}
