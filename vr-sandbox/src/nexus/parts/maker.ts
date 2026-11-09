// The table-driven maker (decision 0026): a family of parts is a table of rows, each from its source (a standard, a
// maker's page) or labelled typical, and one recipe made of the room operations (src/nexus/room.ts) that turns a row
// into a piece; the maker gives it one piece node with a size choice listing every row, its card text, and a check of
// every size against its row (the row's size and mass, where the row has them) for nothing. A size the recipe cannot
// make is refused, saying why. A part drawn as its outline only is an envelope and says so, in its card and in what it
// builds says. No place is written here: every place is an output of the operations.

import type { BlockDef, BlockTest, PortDef, SettingDef, Spec } from '../blocks';
import { partOfBlock, type Block } from '../room';
import type { Part } from '../kits';
import { drawnMassOf, massOf, massSaid, sayMass, type MassSaid } from '../mass';
import { MATTER, notMaterial } from '../matter';

/** What a row says a piece built from it measures: its bound across x, y and z (m) and its mass (kg), where the row has
 *  them; and how near the built piece must come (a share, 0.02 for 2 %), and what the figures are. */
export interface Expect { bound?: [number, number, number]; mass?: number; tol: number; massTol?: number; says: string }
export interface PartFamily<R> {
  /** its node's id (`piece.…`) */
  id: string; name: string; gloss: string; says: string; domains: string[];
  /** where it sits in the parts catalogue: its trade and category, `Fasteners / Nuts` */
  aisle?: string;
  /** every row, by the size it is called by */
  rows: Record<string, R>;
  /** the size the node starts at */
  size: string;
  /** where the rows come from (each row's own source where it carries one) */
  source: string;
  /** its other settings than the size (a length, a head) */
  settings?: SettingDef[];
  /** drawn as its outline only, said in its card and in what it builds says */
  envelope?: string;
  /** the material its recipe makes it of, where the recipe takes one (`set.mat`): its node then offers a material
   *  choice, and a material the tables do not know is refused, saying why */
  mat?: string;
  /** the recipe: a row (and the other settings) to a piece, by the operations only */
  recipe(row: R, size: string, set: Record<string, unknown>): Block;
  /** why the recipe cannot make this size (so set), or null */
  cannot?(row: R, size: string, set: Record<string, unknown>): string | null;
  /** what the row says the built piece measures */
  expect?(row: R, size: string, set: Record<string, unknown>): Expect;
  /** its node's own tests */
  tests: BlockTest[];
}
type AnyFamily = PartFamily<unknown>;

const ROOM_SPEC = { discipline: 'mechanical.design.cad', role: 'geometry operation' as const, codes: [{ scheme: 'MSC2020' as const, code: '68U07', label: 'Computer science aspects of computer-aided design' }] };
const P = (name: string, type: PortDef['type'], more: Partial<PortDef> = {}): PortDef => ({ name, type, ...more });
/** What every piece gives (the same ports as the room's own nodes, blocks.ts ROOM_OUT). */
export const PIECE_OUT: PortDef[] = [P('block', 'block', { label: 'the block, for the next operation' }), P('thing', 'assembly', { label: 'the block, drawn' }), P('pieces', 'integer'), P('faces', 'integer', { label: 'faces where pieces meet' }), P('offers', 'list<text>', { label: 'rooms and lines it offers' }), P('says', 'text')];
export const offersOf = (b: Block): string[] => [...new Set([...b.pieces.flatMap((p) => p.lines.map((l) => l.port)), ...b.rooms.map((r) => r.name)])].sort();
/** Every piece of a part that is drawn (has a shape), however deep: a case's floor and walls, a ring's core. */
const leavesOf = (p: Part): Part[] => [...(p.shape ? [p] : []), ...(p.parts ?? []).flatMap(leavesOf)];
/** The words for an envelope's mass, as what it builds says them: its row's, or unknown (AUDIT 4C). */
export const MASS_UNKNOWN = 'mass unknown: drawn as a solid box';
const kgSaid = (kg: number) => (kg >= 1 ? `${kg.toPrecision(4).replace(/\.?0+$/, '')} kg` : `${(kg * 1000).toPrecision(4).replace(/\.?0+$/, '')} g`);
/** What is said of a built envelope's mass, from its pieces (the maker says it as it builds one): its row's, the sum of
 *  its pieces', or unknown where any piece's is. */
export function envelopeMass(b: Block): MassSaid | undefined {
  const said = leavesOf(partOfBlock(b)).map((p) => massSaid(p)); if (!said.length || said.some((x) => x === undefined)) return undefined;
  const unknown = said.find((x) => x && 'unknown' in x); if (unknown) return unknown;
  return { kg: said.reduce((t, x) => t + (x as { kg: number }).kg, 0), from: (said[0] as { from: string }).from };
}
/** A piece's outputs, as the room's nodes give them; an envelope's says it is one, and what its mass is: its row's, or
 *  unknown (drawn as a solid box). */
export const pieceOut = (b: Block, envelope?: string) => { const m = envelope ? envelopeMass(b) : undefined;
  return { block: b, thing: partOfBlock(b), pieces: b.pieces.length, faces: b.faces.length, offers: offersOf(b),
    says: `${b.name}: ${b.pieces.length} piece${b.pieces.length === 1 ? '' : 's'}, ${b.faces.length} face${b.faces.length === 1 ? '' : 's'} where they meet; every place given by the operations${envelope ? `; an envelope: ${envelope}; ${m && 'kg' in m ? `weighed at its row's mass, ${kgSaid(m.kg)}` : MASS_UNKNOWN}` : ''}` }; };

/** The mass gauge's words for what is shown, from what the board's nodes say (as pieceOut writes it): where an envelope's
 *  mass is unknown, the mass is the outline's as drawn, a solid box's, not the thing's, and the gauge says so (the critic,
 *  2026-11-05: a Raspberry Pi 4 shown at 111.7 g, its row 46 g, as its mass); where every envelope is weighed at its
 *  row's mass (AUDIT 4C), the mass is the thing's and the gauge says where it is from. */
export function massGauge(says: readonly unknown[], shown: boolean): { label: string; sub: string } {
  if (!shown) return { label: 'Mass', sub: 'nothing shown' };
  const all = says.map((s) => String(s ?? ''));
  if (all.some((s) => s.includes(MASS_UNKNOWN) || (/an envelope/.test(s) && !/weighed at its row's/.test(s)))) return { label: 'Mass, as drawn', sub: 'an envelope: mass unknown, drawn as a solid box' };
  return all.some((s) => /an envelope/.test(s)) ? { label: 'Mass', sub: 'an envelope at its row\'s mass' } : { label: 'Mass', sub: 'of all that is shown' };
}

/** Every family made by the maker, by its node's id. */
export const PART_FAMILIES = new Map<string, AnyFamily>();
const sizesSaid = (rows: Record<string, unknown>) => { const k = Object.keys(rows); return k.length > 1 ? `${k[0]} to ${k[k.length - 1]} (${k.length} sizes)` : k.join(''); };
/** A family's card: what it is, every size it has, where the rows come from, and that it is an envelope where it is. */
export const cardOf = (f: AnyFamily): string => `${f.says}. Sizes ${sizesSaid(f.rows as Record<string, unknown>)}, from ${f.source}${f.envelope ? `. An envelope: ${f.envelope}` : ''}`;
/** A size of a family built, or refused saying why. */
export function build<R>(f: PartFamily<R>, size: string, set: Record<string, unknown> = {}): Block {
  if (f.mat) { set = { ...set, mat: String(set.mat ?? f.mat) }; const not = notMaterial(String(set.mat)); if (not) throw new Error(`${f.name} ${size}: ${not}`); }
  const row = f.rows[size]; if (row === undefined) throw new Error(`no ${f.name} ${size}: its sizes are ${Object.keys(f.rows).slice(0, 40).join(', ')}${Object.keys(f.rows).length > 40 ? ' …' : ''}`);
  const why = f.cannot?.(row, size, set); if (why) throw new Error(`${f.name} ${size}: ${why}`);
  const b = f.recipe(row, size, set); if (f.envelope) sayEnvelope(f, row, size, set, b); return b;
}
/** An envelope's mass said as it is built (AUDIT 4C: piece.transformer drew 3,281 kg, its row 420 kg): where its row gives
 *  a mass (its expect's), each of its pieces weighs its share of that mass as their drawings share it (derived: the row's
 *  mass spread as the drawn masses are, so its centre and its inertia are its boxes' scaled to it); where its row gives
 *  none, each piece is said to be of mass unknown and weighs as the solid it is drawn as, said. */
function sayEnvelope<R>(f: PartFamily<R>, row: R, size: string, set: Record<string, unknown>, b: Block): void {
  // (its row's mass: as its expect says it; else a datasheet row's own `mass` (src/data's tables, in SI units, kg: a DC
  // motor's from src/data/motors.ts), where the family's expect does not repeat it)
  const own = (row as { mass?: unknown; source?: unknown } | null), sheet = own && typeof own === 'object' && typeof own.mass === 'number' && typeof own.source === 'string' ? own.mass : undefined;
  const parts = leavesOf(partOfBlock(b)), kg = f.expect?.(row, size, set).mass ?? sheet, drawn = parts.map((p) => drawnMassOf({ ...p, parts: [] })), total = drawn.reduce((t, x) => t + x, 0);
  const from = `${f.name} ${size}: its row's mass (${f.source})`;
  parts.forEach((p, i) => { sayMass(p.name, p.mat, p.shape!, kg !== undefined && kg > 0 && total > 0 ? { kg: (kg * drawn[i]!) / total, from } : { unknown: `${p.name}: ${MASS_UNKNOWN} (${f.name}'s row gives no mass)` }); });
}
/** A family as one piece node: a size choice listing every row, its other settings, its card. */
/** What a family's source is, read from its words (the audit, 2026-11-07: every family was stamped "standard", 436 of them
 *  wrongly): one that names a standard body is a standard (its text says where it is only typical); one that says it is
 *  typical or recalled and names none is a rule of thumb; else a maker's table. */
export function sourceKindOf(cite: string): 'standard' | 'maker' | 'rule of thumb' {
  if (/\b(ISO|DIN|EN|ANSI|ASME|IEC|BS|JIS|SAE|ASTM|NEMA|IEEE|UL|API|AWS|NFPA|IPC|JEDEC|ETSI|ITU|BIPM|AISC|ACI|NDS|AS|CSA)\b/.test(cite)) return 'standard';
  return /typical|recalled|rule of thumb/i.test(cite) ? 'rule of thumb' : 'maker';
}
export function familyNode<R>(f: PartFamily<R>): BlockDef {
  PART_FAMILIES.set(f.id, f as AnyFamily);
  const settings: SettingDef[] = [{ key: 'size', label: 'Size', type: 'choice', default: f.size, choices: Object.keys(f.rows) }, ...(f.settings ?? []),
    ...(f.mat ? [{ key: 'mat', label: 'Material', type: 'choice' as const, default: f.mat, choices: Object.keys(MATTER).filter((k) => !notMaterial(k)).sort() }] : [])];
  const defaults = Object.fromEntries(settings.map((s) => [s.key, s.default]));
  return { id: f.id, name: f.name, version: 1, by: 'built in', pure: true, kind: 'generator', ability: 'generate', domains: f.domains, ...(f.aisle ? { aisle: f.aisle } : {}), says: cardOf(f as AnyFamily), spec: { gloss: f.gloss, ...ROOM_SPEC } as Spec,
    settings, ports: { inputs: [], outputs: PIECE_OUT }, sources: [{ cite: f.source, kind: sourceKindOf(f.source) } as NonNullable<BlockDef['sources']>[number]],
    run: (_i, c) => { const set = { ...defaults, ...c.set }; return pieceOut(build(f, String(set.size), set), f.envelope); }, tests: f.tests };
}

/** A built piece held to its row: its bound and its mass measured (its mass from its drawing, src/nexus/mass.ts) against
 *  what the row says, within the family's tolerance. */
export interface RowCheck { ok: boolean; family: string; size: string; bound: [number, number, number]; mass: number; expect?: Expect; misses: string[]; says: string }
export function checkRow(id: string, size: string, set: Record<string, unknown> = {}, built?: Block): RowCheck {
  const f = PART_FAMILIES.get(id); if (!f) throw new Error(`no family ${id} made by the table-driven maker (${[...PART_FAMILIES.keys()].join(', ')})`);
  const row = f.rows[size]; if (row === undefined) throw new Error(`no ${f.name} ${size}`);
  const defaults = Object.fromEntries((f.settings ?? []).map((s) => [s.key, s.default])), s = { ...defaults, ...set };
  const b = built ?? build(f, size, s), bound = [0, 1, 2].map((k) => b.hi[k]! - b.lo[k]!) as [number, number, number], mass = massOf(partOfBlock(b));
  const e = f.expect?.(row, size, s), misses: string[] = [], mm = (v: number) => (v * 1000).toFixed(2);
  if (e?.bound) for (const k of [0, 1, 2]) if (Math.abs(bound[k]! - e.bound[k]!) > e.tol * e.bound[k]! + 1e-6) misses.push(`its ${'xyz'[k]} ${mm(bound[k]!)} mm, the row's ${mm(e.bound[k]!)} mm`);
  // (an envelope weighs its row's mass where its row gives one (AUDIT 4C), so that is checked too: what reads the room's
  // parts takes it; where the row gives none it is not checked, and says its mass is unknown)
  if (e?.mass !== undefined && Math.abs(mass - e.mass) > (e.massTol ?? e.tol) * e.mass) misses.push(`its mass ${(mass * 1000).toFixed(2)} g, the row's ${(e.mass * 1000).toFixed(2)} g`);
  const said = e ? `${e.says}; within ${(e.tol * 100).toFixed(0)} %${e.mass !== undefined ? ` (mass ${((e.massTol ?? e.tol) * 100).toFixed(0)} %)` : ''}` : 'its row gives no size or mass to check against';
  const drawn = f.envelope ? drawnMassOf(partOfBlock(b)) : mass;
  return { ok: misses.length === 0, family: id, size, bound, mass, ...(e ? { expect: e } : {}), misses,
    says: `${f.name} ${size}: ${misses.length ? `off its row: ${misses.join('; ')}` : 'as its row says'} (${said})${f.envelope ? (e?.mass !== undefined ? `; an envelope, weighed at its row's ${(e.mass * 1000).toFixed(1)} g (drawn as solid, ${(drawn * 1000).toFixed(1)} g)` : `; an envelope, its mass not checked: ${MASS_UNKNOWN} (drawn ${(drawn * 1000).toFixed(1)} g)`) : ''}` };
}
/** The check as a node: a piece wired in (or built from its family and size where none is), held to its row. */
export const CHECK_ROW: BlockDef = {
  id: 'check.row', name: 'Check a piece against its table row', version: 1, by: 'built in', pure: true, kind: 'critic', ability: 'check', domains: ['mechanical', 'manufacturing'],
  says: 'Holds a piece built by a table-driven family (piece.bolt, piece.nut, piece.washer, piece.bearing and the rest the maker makes) to its table\'s row: its bound and its mass, measured from what was built, against the row\'s sizes and the nominal mass worked from them, within a tolerance it states. Wire the piece in, or leave it unwired to build it from the family and size set',
  spec: { gloss: 'Is a piece as big and as heavy as its standard\'s row says?', discipline: 'mechanical.design', role: 'assessment', codes: [{ scheme: 'ICS', code: '21.060.01', label: 'Fasteners in general' }, { scheme: 'ICS', code: '21.100.20', label: 'Rolling bearings' }] },
  settings: [{ key: 'family', label: 'Family (its node)', type: 'text', default: 'piece.bolt' }, { key: 'size', label: 'Size', type: 'text', default: 'M8' }, { key: 'set', label: 'Its other settings (JSON)', type: 'text', default: '{}' }],
  ports: { inputs: [P('block', 'block', { optional: true, label: 'the piece (from the family\'s node)' })], outputs: [P('ok', 'boolean'), P('mass', 'number', { unit: 'kg' }), P('bound', 'list<number>', { label: 'x, y, z, m' }), P('says', 'text')] },
  run: (i, c) => { let set: Record<string, unknown> = {}; try { set = JSON.parse(String(c.set.set ?? '{}')) as Record<string, unknown>; } catch { throw new Error(`its other settings are JSON ("${String(c.set.set)}")`); }
    const r = checkRow(String(c.set.family), String(c.set.size), set, i.block as Block | undefined); return { ok: r.ok, mass: r.mass, bound: r.bound, says: r.says }; },
  tests: [{ inputs: {}, outputs: { ok: true } }, { set: { family: 'piece.nut', size: 'M64' }, inputs: {}, outputs: { ok: true } }],
};
/** A family's piece at a size that comes along a wire, as its table calls it ("M10", "6205"): a size worked out on the
 *  board (a bolt from its load), made by its row, or refused saying the sizes it has. The family's own node keeps its
 *  size a setting, so its card can say what it offers. */
export const SIZED_PIECE: BlockDef = {
  id: 'piece.sized', name: 'Piece at a size worked out', version: 1, by: 'built in', pure: true, kind: 'generator', ability: 'generate', domains: ['mechanical', 'manufacturing'],
  says: 'A piece of any table-driven family (piece.bolt, piece.nut, piece.bearing and the rest) at a size that comes along a wire, as its table calls it ("M10", "6205"): a size worked out on the board (a bolt from its load), made by its row; a size the table does not have refused, with the sizes it has',
  spec: { gloss: 'Which piece does a size worked out on the board make?', ...ROOM_SPEC },
  settings: [{ key: 'family', label: 'Family (its node)', type: 'text', default: 'piece.bolt' }, { key: 'set', label: 'Its other settings (JSON)', type: 'text', default: '{}' }],
  ports: { inputs: [P('size', 'text', { label: 'its size, as its table calls it' })], outputs: PIECE_OUT },
  run: (i, c) => { const f = PART_FAMILIES.get(String(c.set.family)); if (!f) throw new Error(`no family ${String(c.set.family)} made by the table-driven maker (${[...PART_FAMILIES.keys()].slice(0, 12).join(', ')}, …)`);
    let set: Record<string, unknown> = {}; try { set = JSON.parse(String(c.set.set ?? '{}')) as Record<string, unknown>; } catch { throw new Error(`its other settings are JSON ("${String(c.set.set)}")`); }
    const defaults = Object.fromEntries((f.settings ?? []).map((s) => [s.key, s.default])); return pieceOut(build(f, String(i.size ?? '').trim(), { ...defaults, ...set }), f.envelope); },
  tests: [{ set: { family: 'piece.bolt', set: '{"length": 40}' }, inputs: { size: 'M10' }, outputs: { pieces: 2, offers: ['M10 head/axis', 'M10 shank/axis'] } }],
};
